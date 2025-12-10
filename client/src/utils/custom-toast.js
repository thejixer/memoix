import toast from 'react-hot-toast';

class ToastHandler {
	constructor() {}

	error(msg) {
		toast.error(msg, {
			style: {
				border: '1px solid #33ff33',
				background: '#000',
				color: '#33ff33',
			},
		});
	}

	promise({ fn, data, msg, okMsg, errMsg }) {
		toast.promise(fn(data), {
			loading: msg,
			success: okMsg,
			error: errMsg,
		});
	}

	success(msg) {
		toast.success(msg, {
			style: {
				border: '1px solid #33ff33',
				background: '#000',
				color: '#33ff33',
			},
		});
	}
}

const toastMaker = new ToastHandler();
export default toastMaker;
