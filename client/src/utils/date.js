export function formatDate(dateString) {
	const date = new Date(dateString);
	const now = new Date();
	const diffInSeconds = Math.floor((now - date) / 1000);
	const diffInMinutes = Math.floor(diffInSeconds / 60);
	const diffInHours = Math.floor(diffInMinutes / 60);
	const diffInDays = Math.floor(diffInHours / 24);

	if (diffInSeconds < 60) {
		return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
	} else if (diffInMinutes < 60) {
		return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
	} else if (diffInHours < 24) {
		return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
	} else if (diffInDays === 1) {
		return 'yesterday';
	} else if (diffInDays < 7) {
		return `${diffInDays} days ago`;
	} else {
		const pad = num => num.toString().padStart(2, '0');
		const month = pad(date.getMonth() + 1);
		const day = pad(date.getDate());
		const year = date.getFullYear();
		const hours = pad(date.getHours());
		const minutes = pad(date.getMinutes());
		return `${month}-${day}-${year} ${hours}:${minutes}`;
	}
}

export function toISODate(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function formatDateTime(date) {
	if (!(date instanceof Date) || isNaN(date.getTime())) {
		return 'invalid date';
	}

	const pad = n => n.toString().padStart(2, '0');

	const month = pad(date.getMonth() + 1); // months are 0-based
	const day = pad(date.getDate());
	const year = date.getFullYear();

	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());

	return `${month}-${day}-${year} ${hours}:${minutes}`;
}

export function getLastSaturday() {
	const now = new Date();
	const day = now.getDay(); // Sunday=0, Monday=1, ... Saturday=6
	const diff = day === 6 ? 7 : day + 1; // how many days since last Saturday
	const lastSaturday = new Date(now);
	lastSaturday.setDate(now.getDate() - diff);
	lastSaturday.setHours(0, 0, 0, 0);
	return lastSaturday;
}
