
import { useParams, useNavigate } from 'react-router'
import httpClient from '../../utils/http';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import colors from '../../utils/colors';
import Notes from '../../components/notes';
import toastMaker from '../../utils/custom-toast';

const UploadFileModal = ({ isOpen, closeModal, person }) => {
  const navigate = useNavigate();

  const [file, setFile] = useState(null)
  const [fileInputMsg, SetFileInputMsg] = useState("No file selected")

  const handleUpload = async () => {
    if (!file) return toastMaker.error("Please select a file")

    const { status } = await httpClient.uploadFile(`/person/${person.id}/avatar`, file);

    if (status === 200) {
      toastMaker.success("avatar updated")
      return navigate("/person")
    }
     
    toastMaker.error("something went wrong")
  };

  return isOpen
    ?
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
      }} >
        <h2 className='cg' >Upload Avatar</h2>
        <div>
          <input
            type="file"
            id="fileInput"
            style={{ display: "none" }} 
            onChange={e => {
              if (e.target.files[0]) {
                SetFileInputMsg(e.target.files[0].name)
                setFile(e.target.files[0])
              } else {
                SetFileInputMsg("no file selected")
                setFile(null)
              }
            }}  
          />
          <label
            htmlFor="fileInput"
            className='g-btn'
            style={{
              display: "inline-block",
            }}
          >Choose File</label>
          <span className='cg'> {fileInputMsg} </span>
          <button className='g-btn' onClick={handleUpload}>Upload</button>
          <button className='g-btn' onClick={() => closeModal()} style={{ padding: "4px 8px" }} > close </button>
        </div>

      </div>

      <div style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        opacity: .9,
        top: 0,
        left: 0,
        position: "fixed",
        zIndex: 11
      }}  
      onClick={() => closeModal()}>
      </div>
    </>
    :
    null


}

const UpdateNameModal = ({ isOpen, closeModal, person }) => {
  const navigate = useNavigate();
  const [nameInput, setNameInput] = useState("")

  const updateName = async () => {
    if (!nameInput) return toastMaker.error("Please fill the name field")
    
    const { status } = await httpClient.patch(`/person/`, {
      'old_name': person.name,
      'new_name': nameInput
    });

      if (status === 200) {
        toastMaker.success("name updated")
        return navigate("/person")
      }

  }

  return isOpen
    ?
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
      }} >
        <input
          type='text'
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          className="g-inp"
        />
        <button className="g-btn" onClick={() => updateName()} > submit </button>
      </div>
      <div style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        opacity: .9,
        top: 0,
        left: 0,
        position: "fixed",
        zIndex: 11
      }}  
      onClick={() => closeModal()}>
      </div>
    </>
    :
    null
}
export default () => {
  const navigate = useNavigate();

  const [topTags, setTopTags] = useState([])
  const [topMentions, setTopMentions] = useState([])
  const [isModalOpen, setModalOpen] = useState(false)
  const [isUpdateNameModalOpen, setUpdateNameModalOpen] = useState(false)
  const [notes, setNotes] = useState([])
  const [person, setPerson] = useState(null)

  let { id } = useParams();


  const fetchTopTags = async name => {
    const resp = await httpClient.get(`/tag/top-tags?query=@${name}`)
    if (resp.status == 200 && resp.data) {
      setTopTags(resp.data)
    }
  }
  
  const fetchTopMentions = async name => {
    const resp = await httpClient.get(`/mention/top-mentions?query=@${name}`)
    if (resp.status == 200 && resp.data) {
      setTopMentions(resp.data)
    }
  }

  const fetchNotes = async name => {
    const resp = await httpClient.get(`/note/?query=@${name}`)
    if (resp.status == 200) {
      if (resp.data) {
        setNotes(resp.data)
      } else {
        setNotes([])
      }
    } else {
      console.error(resp.data)
      setNotes([])
    }
  }

  useEffect(() => {
    (async () => {
      const resp = await httpClient.get(`/person/${id}`)
      if (resp.status != 200) {
        toastMaker.error("something's wrong")
        return navigate("/dashboard")
      }
      setPerson(resp.data)
      fetchTopTags(resp.data.name)
      fetchTopMentions(resp.data.name)
      fetchNotes(resp.data.name)
    })();
  }, [])

  if (person == null ) return <h1> loading </h1>

  return (
    <div style={{ position: 'relative' }} >
            
      <UploadFileModal
        isOpen={isModalOpen}
        closeModal={() => setModalOpen(false)}
        person={person}
      />

      <UpdateNameModal
        isOpen={isUpdateNameModalOpen}
        closeModal={() => setUpdateNameModalOpen(false)}
        person={person}
      />

      <div style={{ display: "flex", borderBottom: "1px solid #33ff33", paddingBottom: 8 }} >
        <div style={{ width: 140, display: "flex", flexDirection: "column", alignItems: "center" }} >
          <img
            src={person.avatar ? `${Domain}/${person.avatar}` : "/logo.webp"}
            width={80}
            height={80}
            style={{
              borderRadius: "50%",
              margin: 12, cursor: "pointer",
            }}
            onClick={() => setModalOpen(!isModalOpen)}
            onError={e => {
              if (e.target) {
                e.target.src = "/logo.webp"
              }
            }}  
          />
          <button className="g-btn" onClick={e => setUpdateNameModalOpen(true)}  > update name </button>
        </div>
        <div style={{padding: 12}} >
          {topTags.map((tag, index, arr) => {
            return (
              <span key={index} >
                <span style={{color: colors[index % colors.length]}} > {tag.name} ({tag.usage_count}) </span>
                <span className="bg-w"> {index < arr.length - 1 ? "|" : ""} </span>
              </span>
            )
          })}
          <br />
          {topMentions.map((mention, index, arr) => {
            return (
              <span key={index} >
                <span style={{color: colors[(index + topTags.length) % colors.length]}} > @{mention.name} ({mention.usage_count}) </span>
                <span className="bg-w"> {index < arr.length - 1 ? "|" : ""} </span>
              </span>
            )
          })}
        </div>
      </div>


      

      <Notes notes={notes} />
      
    </div>
  )
}