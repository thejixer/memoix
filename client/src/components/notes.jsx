import { useState, useEffect } from 'react'
import { formatDate } from '../utils/date'
import { useNavigate } from "react-router";
import httpClient from '../utils/http';
import toast from 'react-hot-toast';
import toastMaker from '../utils/custom-toast';

const ConfirmDeleteModal = ({ isOpen, CloseModal, Note }) => {
  const navigate = useNavigate();

  const [textInput, setTextInput] = useState("")

  const onDelete = async () => {
    const resp = await httpClient.delete(`/note/${Note.id}`, {})
    if (resp.status == 200) {
      toastMaker.success("post deleted")
      return navigate(0)
    }
    toastMaker.error("something is wrong, please contact our engineers to solve the issue")
  }

  if (Note?.type !== "note") return null

  return (
    <>
      {
        isOpen
        &&
        <>
          <div style={{
            position: "fixed",
            top: "calc(50vh - 250px)",
            left: "calc(50vw - 400px)",
            width: 800,
            maxWidth: "90%",
            height: 150,
            background: "#000",
            border: "1px solid #33ff33",
            color: "#33ff33",
            zIndex: 12,
              padding: "8px 16px"
          }} >
            Are you Seriously Sure You Want to Delete This ? Write "delete" in the input below
            <input className="g-inp" value={textInput} onChange={e => setTextInput(e.target.value)} />
            <button
              className="g-btn"
              style={{ cursor: textInput == "delete" ? "pointer" : "no-drop" }}
              onClick={() => {
                if (textInput != "delete") return
                onDelete()
              }}
            > Delete </button>  
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
            onClick={() => CloseModal()}
          >

          </div>
        </>
      }
    </>
  )
}

export default ({ notes }) => {

  const [isModalOpen, setModalOpen] = useState(false)
  const [CDMOpen, setCDMOpen] = useState(false)
  const [currentNote, setCurrentNote] = useState(null)
  
  const openModal = note => {
    setModalOpen(true)
    setCurrentNote(note)
  }
  const closeModal = () => {
    setModalOpen(false)
    setCurrentNote(null)
  }


  return (

    <div style={{ marginTop: 4 }} >

      {
        isModalOpen 
        &&
        <>
          <div style={{
            position: "fixed",
            top: "calc(50vh - 250px)",
            left: "calc(50vw - 400px)",
            width: 800,
            maxWidth: "90vw",
            height: 400,
            background: "#000",
            border: "1px solid #33ff33",
            color: "#33ff33",
            zIndex: 10
            }}
          >
            <div style={{ display: "flex", flexDirection: "row-reverse", borderBottom: "1px solid #33ff33", height: 50 }} >
              <button  className="g-btn" style={{cursor: currentNote?.type === 'note' ? "pointer" : "no-drop"}} onClick={() => setCDMOpen(true)} > delete </button>
              <button className="g-btn" onClick={() => closeModal()} > close </button>
            </div>
            <div style={{ padding: "8px 16px", overflowY: "auto", height: 340 }} className='scrollable-div' >
              {currentNote.content}       <span style={{ fontSize: 12, marginLeft: 16 }} >{formatDate(currentNote.date)}</span>
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
              zIndex: 5
          }}
            onClick={() => closeModal()}
          >
              
          </div>

        </>
      }

      <ConfirmDeleteModal
        isOpen={CDMOpen}
        CloseModal={() => setCDMOpen(false)}
        Note={currentNote}
      />


      <div className="cg" >
        {
          notes.map((note, index, arr) => {
            return (
              <div
                key={index}
                className='g-shadow'
                style={{
                  border: "1px solid #33FF33",
                  margin: 6, padding: "4px 8px",
                  borderRadius: 4, cursor: "pointer",
                  position: "relative",
                  overflow: "hidden"
                }}
                onClick={() => openModal(note)}
              >
                {
                  note.type == "expense"
                    ?
                    <>
                      <div
                        className='shiny-gradient'
                        style={{
                        width: 32,
                        height: 8,
                          transform: "rotate(-45deg) translateX(-12px) translateY(-10px)",
                        position: "absolute"
                      }} ></div>
                      <span style={{paddingLeft: 8}} > {note.amount} Tomans --- </span>
                    </>
                    :
                    null
                }
                {note.content}  <span style={{ fontSize: 12, marginLeft: 8, display: "inline-block" }} >{formatDate(note.date)}</span> 
              </div>
            )
          })
        }
      </div>
    </div>
  )
}
