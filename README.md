# actions-package-upload
Manages package upload to Chassy Registry.

## Inputs

## `artifact`
**Required** The path to the artifact to Upload.

## `type`
**Required** The of artifact we want to upload. Eg: CONTAINER, FILE, ARCHIVE, RFSIMAGE, FIRMWARE

## `architecture`
'The target chipset architecture, eg: AMD64, ARM64'

## `osID`
**Required** the OS this targets, ie Ubuntu, ThreadX

## `osVersion`
**Required** the version of OS, ie 22.04


## Outputs

## `status`
A log/status message denoting the success of the upload
