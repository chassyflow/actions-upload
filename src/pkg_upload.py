import sys

# Function to easily write to github output.
def write_to_github_output(key, value):
    # Get the path of the $GITHUB_OUTPUT environment variable
    github_output = os.getenv('GITHUB_OUTPUT')
    
    if github_output:
        # Open the file in append mode and write the key=value pair
        with open(github_output, 'a') as output_file:
            output_file.write(f"{key}={value}\n")
        print(f"Successfully wrote {key}={value} to $GITHUB_OUTPUT")
    else:
        print("Error: $GITHUB_OUTPUT is not set in the environment")


def main():
    # Check if the correct number of arguments are passed
    if len(sys.argv) != 5:
        print("Usage: python pkg_upload.py <inputs.artifact> <inputs.type> <inputs.architecture> <inputs.osID> <inputs.osVersion>")
        sys.exit(1)

    # Store arguments in variables
    artifact = sys.argv[1]
    type = sys.argv[2]
    architecture = sys.argv[3]
    osID = sys.argv[4]
    osVersion = sys.argv[5]

    # Print the variables (optional)
    print(f"artifact: {artifact}")
    print(f"type: {type}")
    print(f"architecture: {architecture}")
    print(f"osID: {osID}")
    print(f"osVersion: {osVersion}")

    # output to github the setatus
    write_to_github_output("status", "success")


if __name__ == "__main__":
    main()