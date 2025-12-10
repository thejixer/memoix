import { useState, useEffect } from 'react';
import httpClient from '../../utils/http';
import Notes from '../../components/notes';
import CreateNote from './create-note';
import CreateExpense from './create-expense';
import Header from './header';
import Tabs from '../../components/tabs';
import Analytics from './analytics';
import { onKeysPress } from '../../utils/onKeysPress';

let keys = []

const CreateModal = ({ isOpen, closeModal }) => {
	return isOpen ? (
		<>
			<div
				style={{
					position: 'fixed',
					top: 'calc(50vh - 200px)',
					width: 800,
					left: 'calc(50vw - 400px)',
					background: '#000',
					border: '1px solid #33ff33',
					zIndex: 12,
					color: '#33ff33',
				}}
			>
				<Tabs
					tabs={[
						{
							title: 'Note',
							component: <CreateNote />,
						},
						{
							title: 'Expense',
							component: <CreateExpense />,
						},
					]}
				/>
			</div>
			<div
				style={{
					width: '100vw',
					height: '100vh',
					background: '#000',
					opacity: 0.9,
					top: 0,
					left: 0,
					position: 'fixed',
					zIndex: 11,
				}}
				onClick={() => closeModal()}
			></div>
		</>
	) : null;
};

export default () => {
	// const getFirstDayOfCurrentMonth = () => {
	// 	const now = new Date();
	// 	return new Date(now.getFullYear(), now.getMonth(), 1);
	// };

	const [since, setSince] = useState(null);
	const [until, setUntil] = useState(null);
	const [query, setQuery] = useState('');
	const [topTags, setTopTags] = useState([]);
	const [topMentions, setTopMentions] = useState([]);
	const [notes, setNotes] = useState([]);
	const [stats, setStats] = useState(null);

	// modals
	const [isModalOpen, setModalOpen] = useState(false); // create note/expense modal

	const createURLSearchParams = (q, since, until) => {
		const params = new URLSearchParams();
		if (q) params.append('query', q);
		if (since && since instanceof Date) {
			const startOfDay = new Date(since);
			startOfDay.setHours(0, 0, 0, 0);
			params.append('since', startOfDay.toISOString());
		}
		if (until && until instanceof Date) {
			const endOfDay = new Date(until);
			endOfDay.setHours(23, 59, 59, 999);
			params.append('until', endOfDay.toISOString());
		}
		return params;
	};

	const fetchTopTags = async (q, since, until) => {
		try {
			const params = createURLSearchParams(q, since, until);
			const resp = await httpClient.get(`/tag/top-tags?${params.toString()}`);
			if (resp.status == 200 && resp.data) {
				setTopTags(resp.data);
				return;
			}
			throw new Error('');
		} catch {
			setTopTags([]);
		}
	};

	const fetchTopMentions = async (q, since, until) => {
		try {
			const params = createURLSearchParams(q, since, until);
			const resp = await httpClient.get(
				`/mention/top-mentions?${params.toString()}`
			);
			if (resp.status == 200 && resp.data) {
				setTopMentions(resp.data);
				return;
			}
			throw new Error('');
		} catch (error) {
			setTopMentions([]);
		}
	};

	const fetchNotes = async (q, since, until) => {
		try {
			const params = createURLSearchParams(q, since, until);
			const resp = await httpClient.get(`/note/?${params.toString()}`);
			if (resp.status == 200 && resp.data) {
				setNotes(resp.data);
				return;
			}
			throw new Error('');
		} catch (error) {
			setNotes([]);
		}
	};

	const fetchStatistics = async (q, since, until) => {
		try {
			const params = createURLSearchParams(q, since, until);
			const resp = await httpClient.get(`/stats/?${params.toString()}`);
			if (resp.status === 200 && resp.data) setStats(resp.data);
			else throw new Error('');
		} catch (error) {
			setStats(null);
		}
	};
	const fetchAll = (q, since, until) => {
		fetchTopMentions(q, since, until);
		fetchTopTags(q, since, until);
		fetchNotes(q, since, until);
		fetchStatistics(q, since, until);
	};

	useEffect(() => {
		fetchAll(query, since, until);
	}, []);

	useEffect(() => {
		const onKeyDown = (e) => onKeysPress({ cb: () => alert("salam"), keys: ["Control", "k"], pressedKey: e.key })
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	return (
		<div style={{ paddingBottom: 4, position: 'relative' }}>
			<CreateModal
				isOpen={isModalOpen}
				closeModal={() => setModalOpen(false)}
			/>

			<Header
				fetchAll={fetchAll}
				query={query}
				setQuery={setQuery}
				topTags={topTags}
				topMentions={topMentions}
				since={since}
				until={until}
				setSince={setSince}
				setUntil={setUntil}
			/>

			<div
				className="clickable"
				style={{
					position: 'fixed',
					bottom: 8,
					right: 8,
					background: '#33ff33',
					border: '1px solid #26a326',
					color: '#000',
					zIndex: 10,
					width: 40,
					height: 40,
					borderRadius: '50%',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					fontSize: 24,
				}}
				onClick={() => setModalOpen(true)}
			>
				+
			</div>
			<Tabs
				tabs={[
					{
						title: 'memo',
						component: <Notes notes={notes} />,
					},
					{
						title: 'analytics',
						component: <Analytics stats={stats} />,
					},
				]}
				marginTop={16}
			/>
		</div>
	);
};
