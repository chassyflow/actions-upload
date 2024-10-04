#!/usr/bin/env python3
import os
import sys
import glob

root_dir = "/github/workspace"

valid_types = ["CONTAINER", "FILE", "ARCHIVE", "RFSIMAGE", "FIRMWARE"]
valid_architectures = ["AMD64", "ARM64", "ARMv6", "ARMv7", "RISCV", "UNKNOWN"]
valid_os_id = ["ubuntu", "unknown"]
valid_os_version = ["20.04", "22.04", "24.04", "unknown"]


def print_directory_contents_recursive(path):
    print("python printing directory contents")
    try:
        for root, dirs, files in os.walk(path):
            # Calculate the depth by counting the number of separators
            depth = root.replace(path, '').count(os.sep)
            indent = ' ' * 4 * depth  # 4 spaces per level
            print(f"{indent}{os.path.basename(root)}/")
            subindent = ' ' * 4 * (depth + 1)
            for file in files:
                print(f"{subindent}{file}")
    except FileNotFoundError:
        print(f"Error: The directory '{path}' does not exist.")
    except NotADirectoryError:
        print(f"Error: The path '{path}' is not a directory.")
    except PermissionError:
        print(f"Error: Permission denied for accessing '{path}'.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


# Function to easily write to github output.
def write_to_github_output(key, value):
    """
    This function takes key and value to output to github actions workflow.
    
    Args:
        key (str): The key of the output. This must match the string in output section of actions.yml
        valu (str): The value to assign to the string
    """    
    # Get the path of the $GITHUB_OUTPUT environment variable
    github_output = os.getenv('GITHUB_OUTPUT')
    
    if github_output:
        # Open the file in append mode and write the key=value pair
        with open(github_output, 'a') as output_file:
            output_file.write(f"{key}={value}\n")
        print(f"Successfully wrote {key}={value} to $GITHUB_OUTPUT")
    else:
        print("Error: $GITHUB_OUTPUT is not set in the environment")


def find_file(file_pattern):
    """
    This function takes a file name, a directory pattern, or a file prefix with wildcards.
    It searches for the file and returns the full file path.
    
    Args:
        file_pattern (str): The name of the file, or a pattern with wildcards, or the parent directory pattern.
        
    Returns:
        str: The full path to the found file, or None if no file is found.
    """
    
    # Use glob to search for the file pattern
    # The '**' pattern in glob searches recursively in subdirectories.
    files_found = glob.glob(os.path.join(root_dir, '**', file_pattern), recursive=True)

    # If no files are found, return None.    
    if len(files_found) != 1:
        print(f"files found: {len(files_found)}")
        return None

    print(f"found file {files_found[0]}")
    # If files are found, return the absolute path
    return os.path.abspath(files_found[0])


def validate_parameter(input_param, param_list):
    if input_param not in param_list:
        raise ValueError(f"Error: '{input_param}' is not a valid type.")
    return True


def main():
    # Check if the correct number of arguments are passed
    if len(sys.argv) != 2+5:
        print("Usage: python pkg_upload.py <inputs.artifact> <inputs.type> <inputs.architecture> <inputs.osID> <inputs.osVersion>")
        return 1

    # Store arguments in variables
    artifact = sys.argv[2]
    type = sys.argv[3]
    architecture = sys.argv[4]
    osID = sys.argv[5]
    osVersion = sys.argv[6]

    # validate parameters
    try:
        validate_parameter(type, valid_types)
        validate_parameter(architecture, valid_architectures)
        
        # check if optional parameters are set before validating them
        if osID is not None:
            validate_parameter(osID, valid_os_id)
        if osVersion is not None:
            validate_parameter(osVersion, valid_os_version)
    
    except ValueError:
            print ("Incorrect input param")
            return 2

    # Print the variables (optional)
    print(f"artifact: {artifact}")
    print(f"type: {type}")
    print(f"architecture: {architecture}")
    print(f"osID: {osID}")
    print(f"osVersion: {osVersion}")

    print_directory_contents_recursive(root_dir)

    artifact_path = find_file(artifact)

    # if nothing was returned, send an error
    if artifact_path is None:
        print("No artifact found")
        return 1
    
    # output to github the setatus
    write_to_github_output("status", artifact_path)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
