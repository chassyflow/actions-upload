import * as v from 'valibot'

export type TokenData = {
  accessToken: string
  idToken: string
}

export type Upload = {
  uploadURI: string
}

const imageSchema = v.object({
  id: v.string()
})

export const createImageSchema = v.union([
  v.object({
    image: imageSchema,
    uploadURI: v.string('uploadURI must be string')
  }),
  v.object({
    image: imageSchema,
    uploadId: v.string('uploadId must be string'),
    urls: v.array(
      v.object({
        uploadURI: v.string('uploadURI must be string'),
        expiryTimestamp: v.string('expiryTimestamp must be string'),
        partNumber: v.pipe(
          v.number('partNumber must be number'),
          v.integer('partNumber must be integer')
        )
      })
    )
  })
])

export type CreateImage = v.InferOutput<typeof createImageSchema>

export type CreatePackage = Upload & { package: Package }

export type CreatePackages = {
  packages: CreatePackage[]
}

export type Image = {
  id: string
  // other properties exist but do not matter here
}

export type Package = {
  id: string
  name: string
  sha256: string
  // other properties exist but do not matter here
}
