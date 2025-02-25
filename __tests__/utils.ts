import * as core from '@actions/core'

export const mockInput = (input: Record<string, string>) => {
  const getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
  getInputMock.mockImplementation(property => input[property] || '')
  return getInputMock
}
