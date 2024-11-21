export type TokenData = {
  accessToken: string
  idToken: string
}

export type Upload = {
  uploadURI: string
}

// TODO: Add better types for image and package

export type CreateImage = Upload & { image: Image }

export type CreatePackage = Upload & { package: Package }

export type Image = {
  id: string
}

export type Package = {
  id: string
}
