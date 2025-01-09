# Actions Upload

This GitHub Action will allow you to upload a package or image to Chassy Index.

## Examples

```yml
example-pkg-upload:
  name: Example Package Upload
  runs-on: ubuntu-latest
  env:
    CHASSY_TOKEN: <base64 encoded token>
  steps:
    - name: Checkout
      id: checkout
      uses: actions/checkout@v4
    - name: Chassy package upload
      id: test-action
      uses: chassyflow/actions-upload
      with:
        architecture: 'ARM64'
        os: 'ubuntu'
        os_version: '22.04'
        type: 'IMAGE'
        path: '**/release.img'
        classification: 'RFSIMAGE'
        mode: 'INFO'
```

## Authentication with Chassy

In addition to any configuration options, you also must have `CHASSY_TOKEN`
defined within the environment. This is a secret value and as such should be
stored within your repository's or organization's GitHub secrets. This value is
what allows Chassy to authorize your workflow execution and prevents strangers
from executing workflows that aren't theirs. It is quite a long string encoded
in base64.

| Variable       | Description                                           |
| -------------- | ----------------------------------------------------- |
| `CHASSY_TOKEN` | Authentication token for automated workflow execution |

If `CHASSY_TOKEN` isn't defined, the action will fail to execute the workflow.

## Usage

Each of these options can be used in the `with` section when you call this
action.

| Configuration    | Description                                          | Type     |
| ---------------- | ---------------------------------------------------- | -------- |
| `path`           | Fully qualified or glob path to file(s) for artifact | `string` |
| `architecture`   | Architecture of image to be uploaded                 | `string` |
| `os`             | operating system name for compatibility tracking     | `string` |
| `os_version`     | operating system version for compatibility tracking  | `string` |
| `type`           | what is the artifact type                            | `string` |
| `classification` | for file and archives, what is the class of artifact | `string` |

As of now, all of the configurations are required.

### Path

Path is a string pointing to one or more files. Note: It is only acceptable to
match multiple files if you are using `ARCHIVE` type and `BUNDLE`
classification.

These are examples of valid path values:

- `**/release/web`
- `**/*.zip`
- `./target/release/web`

### Architecture

Architecture indicates the cpu architecture of the uploaded artifact is
compatible with. The following list contains the accepted values for
`architecture`:

- `AMD64`
- `ARM64`
- `ARMv6`
- `ARMv7`
- `RISCV`
- `UNKNOWN`

### OS

OS specifies the name of the operating system name your artifact is compatible
with. Any string is acceptable for `os`. Here are examples:

- `ubuntu`
- `debian`
- `archlinux`

Specifying operating system allows Chassy to determine compatibility with your
machines.

### OS Version

OS version specifies the version of the operating system. It accepts any string,
but here are some examples:

- `22.04`
- `12.0`
- `2024.11.01`

### Version

Version specifies the version of the package itself. It accepts any string, but
is generally expected to be [semantic versioning](https://semver.org/). This
parameter shouldn't be used when uploading an `IMAGE`.

### Type

Type specifies what type of artifact you are attempting to upload. Each type
deserves its own explanation. The accepted values are:

- `IMAGE`
- `FILE`
- `ARCHIVE`
- `FIRMWARE`

#### Image

Image is used when uploading an image for a container.

#### File

File is used to upload a single file.

#### Archive

Archive is used to upload an archive. If multiple files are found when searching
with your provided `path` value, then these values will be zipped together as a
single file.

If your path leads to a single file that happens to be a valid zip file (.zip,
.7z, .tar, .gz), then this file will simply be uploaded.

#### Firmware

Firmware represents device firmware. It is expected you only provide a single
value.

### Classification

Depending on the `type` of your artifact, the available values for
`classification` will change.

#### Image

The valid values for image are:

- `RFSIMAGE`
- `YOCTO`

#### Archive

The only valid value for archive is `BUNDLE`.

#### File and Firmware

File and firmware artifacts support the following classifications:

- `EXECUTABLE`
- `CONFIG`
- `DATA`
