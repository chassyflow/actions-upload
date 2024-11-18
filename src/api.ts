export type TokenData = {
  accessToken: string
  idToken: string
}

export type Upload = {
  uploadURI: string
}

// TODO: Add better types for image and package

export type CreateImage = Upload & { image: any }

export type CreatePackage = Upload & { package: any }
