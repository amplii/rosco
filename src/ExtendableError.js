// https://stackoverflow.com/questions/31089801/extending-error-in-javascript-with-es6-syntax
class ExtendableError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    this.message = message
    Error.captureStackTrace(this, this.constructor.name)
  }
}
export default ExtendableError
