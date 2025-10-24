import { useState } from 'react';

const Tabs = ({ tabs, initialIndex = 0, marginTop = 0 }) => {
	const [activeIndex, setActiveIndex] = useState(initialIndex);

	return (
		<div style={{ marginTop }}>
			<div style={{ display: 'flex' }}>
				{tabs.map((tab, idx) => (
					<div
						key={idx}
						className="tc clickable cg"
						style={{
							flex: 1 / tabs.length,
							borderTop: '1px solid #33ff33',
							borderRight:
								idx !== tabs.length - 1 ? '1px solid #33ff33' : undefined,
							borderBottom: activeIndex === idx ? 'none' : '1px solid #33ff33',
							padding: '8px 16px',
						}}
						onClick={() => setActiveIndex(idx)}
					>
						{tab.title}
					</div>
				))}
			</div>

			{/* Active tab content */}
			<div className="cg" style={{ paddingTop: 8 }}>
				{tabs[activeIndex].component}
			</div>
		</div>
	);
};

export default Tabs;
