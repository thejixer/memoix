import cookieClient from './cookie';

class HttpClient {
	static instance = null;

	constructor(baseURL) {
		if (!HttpClient.instance) {
			this.baseURL = baseURL;
			HttpClient.instance = this;
		}
		return HttpClient.instance;
	}

	#getToken() {
		return cookieClient.getCookie('token'); // Fetch token from cookie
	}

	async get(endpoint) {
		try {
			const token = this.#getToken();
			const response = await fetch(`${this.baseURL}${endpoint}`, {
				method: 'GET',
				headers: {
					Authorization: token ? `ut ${token}` : '',
				},
			});

			const data = await response.json();
			return { data, status: response.status };
		} catch (error) {
			console.error(error);
			return { data: null, status: 500 };
		}
	}

	async post(endpoint, data) {
		try {
			const token = this.#getToken();
			const response = await fetch(`${this.baseURL}${endpoint}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: token ? `ut ${token}` : '',
				},
				body: JSON.stringify(data),
			});

			const responseData = await response.json();
			return { data: responseData, status: response.status };
		} catch (error) {
			console.error(error);
			return { data: null, status: 500 };
		}
	}

	async uploadFile(endpoint, file) {
		try {
			const token = this.#getToken();
			const formData = new FormData();
			formData.append('avatar', file); // "avatar" must match the backend field name

			const response = await fetch(`${this.baseURL}${endpoint}`, {
				method: 'POST',
				headers: {
					Authorization: token ? `ut ${token}` : '',
				},
				body: formData, // No Content-Type needed; FormData sets it automatically
			});

			const responseData = await response.json();
			return { data: responseData, status: response.status };
		} catch (error) {
			console.error(error);
			return { data: null, status: 500 };
		}
	}

	async delete(endpoint, data) {
		try {
			const token = this.#getToken();
			const response = await fetch(`${this.baseURL}${endpoint}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					Authorization: token ? `ut ${token}` : '',
				},
				body: JSON.stringify(data),
			});

			const responseData = await response.json();
			return { data: responseData, status: response.status };
		} catch (error) {
			console.error(error);
			return { data: null, status: 500 };
		}
	}

	async patch(endpoint, data) {
		try {
			const token = this.#getToken();
			const response = await fetch(`${this.baseURL}${endpoint}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: token ? `ut ${token}` : '',
				},
				body: JSON.stringify(data),
			});

			const responseData = await response.json();
			return { data: responseData, status: response.status };
		} catch (error) {
			console.error(error);
			return { data: null, status: 500 };
		}
	}
}

// Export a single instance
const httpClient = new HttpClient('http://localhost:4848');
export default httpClient;
