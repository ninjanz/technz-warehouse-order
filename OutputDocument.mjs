export class OutputDocument {

	/**
	 * @param {Promise<object>} pdfDocumentPromise
	 */
	constructor(pdfDocumentPromise) {
		this.bufferSize = 9007199254740991;
		this.pdfDocumentPromise = pdfDocumentPromise;
	}

	/**
	 * @returns {Promise<object>}
	 */
	async getStream() {
		return this.pdfDocumentPromise;
	}

	/**
	 * @returns {Promise<Buffer>}
	 */
	async getBuffer() {
		stream = await this.getStream()
		let chunks = []
		let result;

		stream.on('readable', () => {
			let chunk;
			while ((chunk = stream.read(this.bufferSize)) !== null) {
				chunks.push(chunk);
			}
		});
		stream.on('end', () => {
			result = Buffer.concat(chunks);
			return result;
		});
		stream.end();

		/*return new Promise((resolve, reject) => {
			this.getStream().then(stream => {

				let chunks = [];
				let result;
				stream.on('readable', () => {
					let chunk;
					while ((chunk = stream.read(this.bufferSize)) !== null) {
						chunks.push(chunk);
					}
				});
				stream.on('end', () => {
					result = Buffer.concat(chunks);
					resolve(result);
				});
				stream.end();

			}, result => {
				reject(result);
			});
		});*/
	}

	/**
	 * @returns {Promise<string>}
	 */
	async getBase64() {
		return new Promise((resolve, reject) => {
			this.getBuffer().then(buffer => {
				resolve(buffer.toString('base64'));
			}, result => {
				reject(result);
			});
		});
	}

	/**
	 * @returns {Promise<string>}
	 */
	async getDataUrl() {
		return new Promise((resolve, reject) => {
			this.getBase64().then(data => {
				resolve('data:application/pdf;base64,' + data);
			}, result => {
				reject(result);
			});
		});
	}

}