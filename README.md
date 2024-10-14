# Actions workflow run

This GitHub Action will allow you to upload a package or image to Chassy Index.

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

## Usage in Development

Each of these options can be used in the `with` section when you call this
action.

| Configuration     | Description                                                           | Type      |
| ----------------- | --------------------------------------------------------------------- | --------- |
| `path`            | Fully qualified path to image file or a glob search path for image    | `string`  |
| `architecture`    | Architecture of image to be uploaded                                  | `string`  |
| `os`              | operating system name for compatibility tracking                      | `string`  |
| `version`         | operating system version for compatibility tracking                   | `string`  |
| `type`            | what is the artifact type                                             | `string`  |
| `classification`  | for file and archives, what is the class of artifact (optional)       | `string`  |
| `mode`            | determine if we should run in debug or standard info mode (optional)  | `string`  |
| `dryrun`          | determine if we should run in dryrun mode or note (optional)          | `string`  |

### Default Values

| Configuration | Default Value |
| ----------------- | --------- |
| `path`            | **NONE**  |
| `architecture`    | **NONE**  |
| `os`              | **NONE**  |
| `version`         | **NONE**  |
| `type`            | **NONE**  |
| `classification`  | **NONE**  |
| `mode`            | `false`   |
| `dryrun`          | `false`   |

## Development
Add the package upload action to your workflow by checking it out and then having the correct input args.

For example, see the following:
```yml
  example-pkg-upload:
    name: Example Package Upload
    runs-on: ubuntu-latest
    env:
      CHASSY_TOKEN: <base64 encoded token>
      CHASSY_ENDPOINT: https://api.test.chassy.dev
    steps:
      - name: Checkout
        id: checkout
        uses: actions/checkout@v4
      - name: Chassy package upload
        id: test-action
        uses: chassyflow/actions-package-upload
        with:
          architecture: "--architecture ARM64"
          os: "--os ubuntu"
          version: "--version 22.04"
          type: "--type IMAGE"
          path: "--path **/release.img"
          classification: "--classification RFSIMAGE"
          mode: "--mode INFO"
          dryrun: "--dryrun false"
```
