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
    uploadURI: v.string()
  }),
  v.object({
    image: imageSchema,
    uploadId: v.string(),
    urls: v.array(
      v.object({
        uploadURI: v.string(),
        expiryTimestamp: v.date(),
        partNumber: v.pipe(v.number(), v.integer())
      })
    )
  })
])

export type CreateImage = v.InferOutput<typeof createImageSchema>

export type CreatePackage = Upload & { package: Package }

export type Image = {
  id: string
  // other properties exist but do not matter here
}

export type Package = {
  id: string
  // other properties exist but do not matter here
}
