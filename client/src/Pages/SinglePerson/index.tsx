import { useParams, useNavigate } from 'react-router';
import httpClient from '../../libs/api/httpClient';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import colors from '../../libs/utils/colors';
import toastMaker from '../../libs/utils/custom-toast';
import Notes from '../../ui/components/notes';
import { Button } from '../../ui/primitives';

// --- Types ---
interface Person {
  id: string;
  name: string;
  phone_number?: string;
  avatar?: string;
}

interface NoteType {
  id: string;
  type: 'note' | 'expense';
  content: string;
  date: string;
  amount?: number;
}

interface Tag {
  name: string;
  usage_count: number;
}

interface Mention {
  name: string;
  usage_count: number;
}

// --- Modals ---
interface UploadFileModalProps {
  isOpen: boolean;
  closeModal: () => void;
  person: Person;
}

const UploadFileModal: React.FC<UploadFileModalProps> = ({ isOpen, closeModal, person }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [fileInputMsg, setFileInputMsg] = useState("No file selected");

  const handleUpload = async () => {
    if (!file) return toastMaker.error("Please select a file");

    const { status } = await httpClient.uploadFile(`/person/${person.id}/avatar`, file);

    if (status === 200) {
      toastMaker.success("avatar updated");
      return navigate("/person");
    }

    toastMaker.error("something went wrong");
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{
        position: "fixed",
        top: "calc(50vh - 200px)",
        width: 800,
        left: "calc(50vw - 400px)",
        background: "#000",
        border: "1px solid #33ff33",
        padding: "8px 16px",
        zIndex: 12
      }}>
        <h2 className='cg'>Upload Avatar</h2>
        <div>
          <input
            type="file"
            id="fileInput"
            style={{ display: "none" }}
            onChange={e => {
              const f = e.target.files?.[0] ?? null;
              setFileInputMsg(f ? f.name : "no file selected");
              setFile(f);
            }}
          />
          <label htmlFor="fileInput" className='g-btn' style={{ display: "inline-block" }}>Choose File</label>
          <span className='cg'> {fileInputMsg} </span>
          <Button onClick={handleUpload}>Upload</Button>
          <Button style={{ padding: "4px 8px" }} onClick={closeModal}>Close</Button>
        </div>
      </div>

      <div style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        opacity: 0.9,
        top: 0,
        left: 0,
        position: "fixed",
        zIndex: 11
      }} onClick={closeModal} />
    </>
  );
};

// --- Update Name Modal ---
interface UpdateNameModalProps {
  isOpen: boolean;
  closeModal: () => void;
  person: Person;
}

const UpdateNameModal: React.FC<UpdateNameModalProps> = ({ isOpen, closeModal, person }) => {
  const navigate = useNavigate();
  const [nameInput, setNameInput] = useState("");

  const updateName = async () => {
    if (!nameInput) return toastMaker.error("Please fill the name field");

    const { status } = await httpClient.patch(`/person/`, {
      old_name: person.name,
      new_name: nameInput
    });

    if (status === 200) {
      toastMaker.success("name updated");
      navigate("/person");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{
        position: "fixed",
        top: "calc(50vh - 200px)",
        width: 800,
        left: "calc(50vw - 400px)",
        background: "#000",
        border: "1px solid #33ff33",
        padding: "8px 16px",
        zIndex: 12
      }}>
        <span className='cg'>Name</span>
        <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} className="g-inp" />
        <button className="g-btn" onClick={updateName}>Submit</button>
      </div>
      <div style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        opacity: 0.9,
        top: 0,
        left: 0,
        position: "fixed",
        zIndex: 11
      }} onClick={closeModal} />
    </>
  );
};

// --- Update Phone Modal ---
interface UpdatePhoneModalProps {
  isOpen: boolean;
  closeModal: () => void;
  person: Person;
}

const UpdatePhoneNumberModal: React.FC<UpdatePhoneModalProps> = ({ isOpen, closeModal, person }) => {
  const navigate = useNavigate();
  const [phoneInput, setPhoneInput] = useState("");

  const updatePhoneNumber = async () => {
    if (!phoneInput) return toastMaker.error("Please fill the phone field");

    const isValidPhone = /^(\+98|0|0098)?9\d{9}$/.test(phoneInput);
    if (!isValidPhone) return toastMaker.error("Please enter a valid phone number");

    const { status } = await httpClient.patch(`/person/phone`, {
      id: person.id,
      phone_number: phoneInput
    });

    if (status === 200) {
      toastMaker.success("phone updated");
      navigate(0);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{
        position: "fixed",
        top: "calc(50vh - 200px)",
        width: 800,
        left: "calc(50vw - 400px)",
        background: "#000",
        border: "1px solid #33ff33",
        padding: "8px 16px",
        zIndex: 12
      }}>
        <span className='cg'>Phone Number</span>
        <input type="text" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} className="g-inp" />
        <button className="g-btn" onClick={updatePhoneNumber}>Submit</button>
      </div>
      <div style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        opacity: 0.9,
        top: 0,
        left: 0,
        position: "fixed",
        zIndex: 11
      }} onClick={closeModal} />
    </>
  );
};

// --- Main Component ---
export default function SinglePerson() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [topTags, setTopTags] = useState<Tag[]>([]);
  const [topMentions, setTopMentions] = useState<Mention[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isUpdateNameModalOpen, setUpdateNameModalOpen] = useState(false);
  const [isUpdatePhoneModalOpen, setUpdatePhoneModalOpen] = useState(false);
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [person, setPerson] = useState<Person | null>(null);

  const fetchTopTags = async (name: string) => {
    const resp = await httpClient.get(`/tag/top-tags?query=@${name}`);
    if (resp.status === 200 && resp.data) setTopTags(resp.data);
  };

  const fetchTopMentions = async (name: string) => {
    const resp = await httpClient.get(`/mention/top-mentions?query=@${name}`);
    if (resp.status === 200 && resp.data) setTopMentions(resp.data);
  };

  const fetchNotes = async (name: string) => {
    const resp = await httpClient.get(`/note/?query=@${name}`);
    if (resp.status === 200) setNotes(resp.data ?? []);
    else setNotes([]);
  };

  useEffect(() => {
    (async () => {
      if (!id) return navigate("/dashboard");
      const resp = await httpClient.get(`/person/${id}`);
      if (resp.status !== 200) {
        toastMaker.error("Something's wrong");
        return navigate("/dashboard");
      }
      setPerson(resp.data);
      fetchTopTags(resp.data.name);
      fetchTopMentions(resp.data.name);
      fetchNotes(resp.data.name);
    })();
  }, [id]);

  if (!person) return <h1>Loading...</h1>;

  return (
    <div style={{ position: 'relative' }}>
      <UploadFileModal isOpen={isModalOpen} closeModal={() => setModalOpen(false)} person={person} />
      <UpdateNameModal isOpen={isUpdateNameModalOpen} closeModal={() => setUpdateNameModalOpen(false)} person={person} />
      <UpdatePhoneNumberModal isOpen={isUpdatePhoneModalOpen} closeModal={() => setUpdatePhoneModalOpen(false)} person={person} />

      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", alignItems: "start" }}>
          <div style={{ padding: 8 }}>
            <div>
              <button className="g-btn" onClick={() => setUpdateNameModalOpen(true)}>Update Name</button>
              <button className="g-btn" onClick={() => setUpdatePhoneModalOpen(true)}>Update Phone</button>
            </div>
            <div className='cg' style={{ paddingLeft: 8 }}>
              Phone Number: {person.phone_number ?? "Not Specified"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, borderBottom: "1px solid #33ff33", paddingBottom: 8 }}>
        {topTags.map((tag, index, arr) => (
          <span key={index}>
            <span style={{ color: colors[index % colors.length] }}>
              {tag.name} ({tag.usage_count})
            </span>
            <span className="bg-w">{index < arr.length - 1 ? "|" : ""}</span>
          </span>
        ))}
        <br />
        {topMentions.map((mention, index, arr) => (
          <span key={index}>
            <span style={{ color: colors[(index + topTags.length) % colors.length] }}>
              @{mention.name} ({mention.usage_count})
            </span>
            <span className="bg-w">{index < arr.length - 1 ? "|" : ""}</span>
          </span>
        ))}
      </div>

      <Notes notes={notes} />
    </div>
  );
}
