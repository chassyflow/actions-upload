#!/usr/bin/env python3

import argparse
import os
import pathlib
import sys
import glob
import logging
import requests

root_dir = "/github/workspace"
api_base_url = 'https://api.test.chassy.dev/v1',

logger = logging.getLogger()
logger.addHandler(logging.StreamHandler())

# Function to easily write to github output.
def _write_to_github_output(key, value):
    """
    This function takes key and value to output to github actions workflow.
    
    Args:
        key (str): The key of the output. This must match the string in output section of actions.yml
        value (str): The value to assign to the string
    """    
    # Get the path of the $GITHUB_OUTPUT environment variable
    github_output = os.getenv('GITHUB_OUTPUT')
    
    if github_output:
        # Open the file in append mode and write the key=value pair
        with open(github_output, 'a') as output_file:
            output_file.write(f"{key}={value}\n")
        logger.debug(f"Successfully wrote {key}={value} to $GITHUB_OUTPUT")
    else:
        logger.debug("Error: $GITHUB_OUTPUT is not set in the environment")


def _check_preconditions(required_vars=None):
    """
    Ensures our expectations are met prior to execution to avoid any surprises during execution.
    Primarily checks that specified required_vars are defined as environment variables.
    :return:
    """
    if required_vars is None:
        required_vars = []
    for value in required_vars:
        if os.getenv(value) is None:
            logger.error(f"critical variable {value} is missing.")
            raise Exception(f"could not find required value {value}.")


def _find_files(file_pattern):
    """
    This function takes a file name, a directory pattern, or a file prefix with wildcards.
    It searches for the file and returns the full file path.
    
    Args:
        file_pattern (str): The name of the file, or a pattern with wildcards, or the parent directory pattern.
        
    Returns:
        a generator for all files discovered matching pattern
    """
    
    # Use glob to search for the file pattern
    # The '**' pattern in glob searches recursively in subdirectories.
    files_found = glob.glob(os.path.join(root_dir, '**', file_pattern), recursive=True)

    for file in files_found:
        yield os.path.abspath(file)


def _get_credentials():
    chassy_refresh_token_b64 = os.getenv('CHASSY_TOKEN')
    if chassy_refresh_token_b64 is None or chassy_refresh_token_b64 is '':
        raise KeyError("Environment variable 'CHASSY_TOKEN' not found.")
    
    logger.debug("making request to refresh token")

    refresh_token_url = f"{api_base_url}/token/user"
    token_request_body = {
        "token": chassy_refresh_token_b64
    }

    try:
        response = requests.post(
            refresh_token_url,
            headers={"Content-Type": "application/json"},
            json=token_request_body
        )
        # Raises HTTPError for bad responses (4xx or 5xx)
        response.raise_for_status()
        refresh_token_response = response.json()
    except requests.exceptions.HTTPError as http_err:
        logger.critical(f"HTTP error occurred: {http_err}")  # HTTP error
    except Exception as err:
        logger.critical(f"An error occurred: {err}")  # Other errors

    return refresh_token_response.idToken


def _get_upload_url(credentials: str,
                    name: str,
                    architecture: str,
                    os_name: str,
                    os_version: str,
                    type: str):
    base_url, url = None, None
    if os.getenv('CHASSY_ENDPOINT') is None:
        base_url = 'https://api.chassy.io'
    else:
        base_url = os.getenv('CHASSY_ENDPOINT')

    if type == 'IMAGE':
        url = base_url + '/v1/image'
    else:
        url = base_url + '/v1/package'

    response = requests.post(url,
                             json={
                                'name': name,
                                'compatibility': {
                                    'versionID': os_version,
                                    'osID': os_name,
                                    'architecture': architecture
                                },
                                'type': type,
                                'provenanceURI': os.getenv('GITHUB_REF', 'N/A'),
                             },
                             headers={
                                 'Authorization': credentials
                             })
    return response.uploadURI


def _put_a_file(upload_url, file_path):
    """
    This function takes a destination URL and a fully qualified file path and uploads the file to the URL as a PUT request
    
    Args:
        upload_url (str): the URL to upload the file to.
        file_path (str): the fully qualified file path to upload to
    """
    with open(file_path, 'rb') as file:
        headers = {'Content-Type': 'application/octet-stream'}
        logger.debug(f"starting upload of file {file_path} to {upload_url}")
        response = requests.put(upload_url, data=file, headers=headers)

    # Check the response status
    if response.ok:
        logger.debug('File uploaded successfully.')
    else:
        logger.debug(f'Failed to upload file. Status code: {response.status_code}')
        logger.debug('Response:', response.text)
        # raise an http error since things aren't okay
        response.raise_for_status()

def _image_uploads(args):
    """
    Core routine responsible for uploading images to Chassy registry.
    :param args:
    :return:
    """
    for image_file in _find_files(str(args.path)):
        logger.debug(f"discovered {image_file} to be processed")
        _f = pathlib.Path(image_file)
        file_name = _f.name

        # remove any suffixes e.g .img from file to extract canonical name
        if _f.suffix:
            file_name = file_name.strip(_f.suffix)

        logger.debug(f"logical name of image is {file_name}")
        authorization_token = _get_credentials()

        upload_url = _get_upload_url(authorization_token, _f, args.architecture)
        _put_a_file(upload_url, args.path)
   
    return True


def _file_uploads(args):
    """
    Core routine responsible for uploading binaries/files/archives to Chassy registry
    :param args:
    :return:
    """
    for file in _find_files(str(args.path)):
        logger.debug(f"discovered {file} to be processed")
        _f = pathlib.Path(file)
        file_name = _f.name    

        # remove any suffixes e.g .img from file to extract canonical name
        if _f.suffix:
            file_name = file_name.strip(_f.suffix)

        logger.debug(f"logical name of image is {file_name}")
        authorization_token = _get_credentials()
        upload_url = _get_upload_url(authorization_token, _f, args.architecture)
        _put_a_file(upload_url, args.path)

    return True


def _handler(args) -> int:
    if args.mode == 'DEBUG':
        logger.setLevel(logging.DEBUG)
    else:
        logger.setLevel(logging.INFO)

    _check_preconditions("GITHUB_OUTPUT")
    _check_preconditions("CHASSY_TOKEN")
    _check_preconditions("CHASSY_ENDPOINT")        

    if args.type == 'IMAGE':
        status = _image_uploads(args)
    else:
        status = _file_uploads(args)

    if status is True:
        _write_to_github_output("Status", "Successfully uploaded file.")

def main() -> int:
    """
    initiates execution of this application, chiefly responsible for parsing parameters.
    :return:
    """
    parser = argparse.ArgumentParser(prog='chassy-upload',
                                     description='chassy artifact and image uploader')
    parser.set_defaults(func=_handler)
    parser.add_argument('-p',
                          '--path',
                          required=True,
                          action='store',
                          type=pathlib.Path,
                          help='fully qualified path to image file or a glob search path for image')
    parser.add_argument('-a',
                          '--architecture',
                          choices=["AMD64", "ARM64", "ARMv6", "ARMv7", "RISCV", "UNKNOWN"],
                          required=True,
                          action='store',
                          help='architecture of image to be uploaded')
    parser.add_argument('-o',
                        '--os',
                        action='store',
                        required=True,
                        help='operating system name for compatibility tracking')
    parser.add_argument('-i',
                        '--version',
                        action='store',
                        required=True,
                        help='operating system version for compatibility tracking')
    parser.add_argument('-t',
                        '--type',
                        action='store',
                        choices=["FILE", "ARCHIVE", "IMAGE", "FIRMWARE"],
                        required=True,
                        help='what is the artifact type')
    parser.add_argument('-c',
                        '--classification',
                        action='store',
                        choices=["EXECUTABLE", "CONFIG", "DATA", "BUNDLE"],
                        required=False,
                        help='for file and archives, what is the class of artifact')
    parser.add_argument('-m',
                        '--mode',
                        choices=['DEBUG', 'INFO'],
                        required=False,
                        default='INFO',
                        help='determine if we should run in debug or standard info mode')
    parser.add_argument('-d',
                          '--dryrun',
                          action='store_true',
                          help='determine if we should run in dryrun mode or not',
                          required=False,
                          default=False)    
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
