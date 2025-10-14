import { useState, useEffect } from "react";
import httpClient from "../../libs/api/httpClient";
import CreateNote from "./create-note";
import CreateExpense from "./create-expense";
import ActivityHeatmap from "../../ui/components/heatmap";
import Notes from "../../ui/components/notes";
import { formatDateTime, toISODate } from "../../libs/utils/date";
import colors from "../../libs/utils/colors";


interface CreateModalProps {
  isOpen: boolean;
  closeModal: () => void;
}

interface NoteType {
  id: string;
  type: "note" | "expense";
  content: string;
  date: string;
  amount?: number;
}

const CreateModal: React.FC<CreateModalProps> = ({ isOpen, closeModal }) => {
  const [stepper, setStepper] = useState<1 | 2>(1);

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: "calc(50vh - 200px)",
          width: 800,
          left: "calc(50vw - 400px)",
          background: "#000",
          border: "1px solid #33ff33",
          zIndex: 12,
          color: "#33ff33",
        }}
      >
        <div style={{ display: "flex" }}>
          <div
            className="tc clickable"
            style={{
              flex: 0.5,
              borderRight: "1px solid #33ff33",
              borderBottom: stepper === 1 ? "none" : "1px solid #33ff33",
              padding: "8px 16px",
            }}
            onClick={() => setStepper(1)}
          >
            note
          </div>
          <div
            className="tc clickable"
            style={{
              flex: 0.5,
              borderBottom: stepper === 2 ? "none" : "1px solid #33ff33",
              padding: "8px 16px",
            }}
            onClick={() => setStepper(2)}
          >
            expense
          </div>
        </div>
        <div style={{ padding: "8px 16px" }}>
          {stepper === 1 ? <CreateNote /> : <CreateExpense />}
        </div>
      </div>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#000",
          opacity: 0.9,
          top: 0,
          left: 0,
          position: "fixed",
          zIndex: 11,
        }}
        onClick={closeModal}
      />
    </>
  );
};

interface StatsModalProps {
  isOpen: boolean;
  closeModal: () => void;
  stats: Stats | null;
}

interface Stats {
  dates: string[];
  total_count: number;
  first_date: string;
  last_date: string;
  average_gap: number;
  median_gap: number;
  min_gap: number;
  max_gap: number;
  std_dev_gap: number;
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, closeModal, stats }) => {
  if (!isOpen || !stats) return null;

  const datesObj: Record<string, number> = {};
  stats.dates.forEach((d) => {
    const date = new Date(d);
    datesObj[toISODate(date)] = 1;
  });

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 900,
          background: "#000",
          border: "1px solid #33ff33",
          zIndex: 12,
          color: "#33ff33",
          padding: "1rem",
          borderRadius: "8px",
        }}
      >
        <ActivityHeatmap data={datesObj} />
        <div className="stats-container" style={{ marginTop: 12 }}>
          <div className="stat-item">
            <span className="stat-title">Total count:</span>
            <span className="stat-value"> {stats.total_count} </span>
          </div>
          <div className="stat-item">
            <span className="stat-title">first occurance:</span>
            <span className="stat-value"> {formatDateTime(new Date(stats.first_date))} </span>
          </div>
          <div className="stat-item">
            <span className="stat-title">last occurance:</span>
            <span className="stat-value"> {formatDateTime(new Date(stats.last_date))} </span>
          </div>
          <div className="stat-item">
            <span className="stat-title">average gap:</span>
            <span className="stat-value"> {stats.average_gap.toFixed(3)} </span>
          </div>
          <div className="stat-item">
            <span className="stat-title">median gap:</span>
            <span className="stat-value"> {stats.median_gap.toFixed(3)} </span>
          </div>
          <div className="stat-item">
            <span className="stat-title">min gap:</span>
            <span className="stat-value"> {stats.min_gap.toFixed(3)} </span>
          </div>
          <div className="stat-item">
            <span className="stat-title">max gap:</span>
            <span className="stat-value"> {stats.max_gap.toFixed(3)} </span>
          </div>
          <div className="stat-item">
            <span className="stat-title">stdv gap:</span>
            <span className="stat-value"> {stats.std_dev_gap.toFixed(3)} </span>
          </div>
        </div>
      </div>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#000",
          opacity: 0.9,
          top: 0,
          left: 0,
          position: "fixed",
          zIndex: 11,
        }}
        onClick={closeModal}
      />
    </>
  );
};

interface TopTag {
  name: string;
  usage_count: number;
}

interface TopMention {
  name: string;
  usage_count: number;
}

interface Note {
  id: string;
  content: string;
}

const HomePage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [topTags, setTopTags] = useState<TopTag[]>([]);
  const [topMentions, setTopMentions] = useState<TopMention[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isStatsModalOpen, setStatsModalOpen] = useState(false);

  const fetchTopTags = async (q: string) => {
    try {
      const resp = await httpClient.get(`/tag/top-tags?query=${encodeURIComponent(q)}`);
      if (resp.status === 200 && resp.data) {
        setTopTags(resp.data);
        return;
      }
      throw new Error();
    } catch {
      setTopTags([]);
    }
  };

  const fetchTopMentions = async (q: string) => {
    try {
      const resp = await httpClient.get(`/mention/top-mentions?query=${encodeURIComponent(q)}`);
      if (resp.status === 200 && resp.data) {
        setTopMentions(resp.data);
        return;
      }
      throw new Error();
    } catch {
      setTopMentions([]);
    }
  };

  
const fetchNotes = async () => {
  const resp = await httpClient.get("/note/?query=")
  if (resp.status === 200 && resp.data) {
    const mapped: NoteType[] = resp.data.map((n: any) => ({
      id: n.id,
      type: n.type || "note", // default if missing
      content: n.content || "",
      date: n.date || new Date().toISOString(),
      amount: n.amount,
    }));
    setNotes(mapped);
  }
};

  const fetchStatistics = async (q: string) => {
    try {
      const resp = await httpClient.get(`/stats/?query=${encodeURIComponent(q)}`);
      if (resp.status === 200 && resp.data) setStats(resp.data);
    } catch {
      setStats(null);
    }
  };

  const fetchAll = (q: string) => {
    fetchTopTags(q);
    fetchTopMentions(q);
    fetchNotes();
    fetchStatistics(q);
  };

  useEffect(() => {
    fetchAll(query);
  }, []);

  return (
    <div style={{ paddingBottom: 4, position: "relative" }}>
      <CreateModal isOpen={isModalOpen} closeModal={() => setModalOpen(false)} />
      <StatsModal isOpen={isStatsModalOpen} closeModal={() => setStatsModalOpen(false)} stats={stats} />

      <div className="g-btn" style={{ position: "absolute", top: 8, left: 8 }} onClick={() => setModalOpen(true)}>
        create
      </div>
      <div
        className="g-btn"
        style={{ position: "absolute", top: 8, right: 8, cursor: !stats ? "no-drop" : "pointer" }}
        onClick={() => {
          if (!stats) return;
          setStatsModalOpen(true);
        }}
      >
        stats
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <input
          className="g-inp"
          type="text"
          value={query}
          style={{ margin: 1 }}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") fetchAll(query);
          }}
        />
        <button className="g-btn" style={{ margin: 1 }} onClick={() => fetchAll(query)}>
          search
        </button>
        <button
          disabled={!query}
          style={{ cursor: !query ? "no-drop" : "pointer", margin: 1 }}
          className="g-btn"
          onClick={() => {
            if (!query) return;
            setQuery("");
            fetchAll("");
          }}
        >
          clear filters
        </button>
      </div>

      <div style={{ padding: "0 8px" }}>
        {topTags.map((tag, index, arr) => (
          <span key={index}>
            <span
              style={{ color: colors[index % colors.length], cursor: "pointer" }}
              onClick={() => {
                const newValue = query + " " + tag.name;
                setQuery(newValue);
                fetchAll(newValue);
              }}
            >
              {tag.name} ({tag.usage_count})
            </span>
            <span className="bg-w"> {index < arr.length - 1 ? "|" : ""} </span>
          </span>
        ))}
      </div>
      <div style={{ padding: "0 8px" }}>
        {topMentions.map((mention, index, arr) => (
          <span key={index}>
            <span
              style={{ color: colors[(index + topTags.length) % colors.length], cursor: "pointer" }}
              onClick={() => {
                const newValue = query + " @" + mention.name;
                setQuery(newValue);
                fetchAll(newValue);
              }}
            >
              @{mention.name} ({mention.usage_count})
            </span>
            <span className="bg-w"> {index < arr.length - 1 ? "|" : ""} </span>
          </span>
        ))}
      </div>

      <Notes notes={notes} />
    </div>
  );
};

export default HomePage;
