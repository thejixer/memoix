import { useOutletContext } from "react-router";
import { useState , useEffect} from "react";
import httpClient from "../../utils/http";
import colors from "../../utils/colors";
import Notes from "../../components/notes";
import CreateNote from "./create-note";
import CreateExpense from "./create-expense";

const CreateModal = ({ isOpen, closeModal }) => {

  const [stepper, setStepper] = useState(1)

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
        zIndex: 12,
        color: "#33ff33"
      }} >

        <div style={{display: "flex"}} >
          <div
            className="tc clickable"
            style={{
              flex: .5,
              borderRight: "1px solid #33ff33",
              borderBottom: stepper == 1 ? "none" : "1px solid #33ff33",
              padding: "8px 16px"
            }}
            onClick={() => setStepper(1) }
          >
            note
          </div>
          <div
            className="tc clickable"
            style={{
              flex: .5, borderBottom: stepper == 2 ? "none" : "1px solid #33ff33",
              padding: "8px 16px"
            }}
            onClick={() => setStepper(2)}
          >
            expense
          </div>
        </div>

        <div style={{ padding: "8px 16px" }} >
          {
            stepper == 1
              ?
              <CreateNote />
              :
              <CreateExpense />
          }
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

export default () => {

  const [query, setQuery] = useState("")
  const [topTags, setTopTags] = useState([])
  const [topMentions, setTopMentions] = useState([])
  const [notes, setNotes] = useState([])
  const [isModalOpen, setModalOpen] = useState(false)

  const fetchTopTags = async (q) => {

    const resp = await httpClient.get(`/tag/top-tags?query=${encodeURIComponent(q)}`)
    if (resp.status == 200) {
      if (resp.data) {
        setTopTags(resp.data)
      } else {
        setTopTags([])
      }
    } else {
      console.error(resp.data)
      setTopTags([])
    }
  }

  const fetchTopMentions = async (q) => {
    const resp = await httpClient.get(`/mention/top-mentions?query=${encodeURIComponent(q)}`)
    if (resp.status == 200) {
      if (resp.data) {
        setTopMentions(resp.data)
      } else {
        setTopMentions([])
      }
    } else {
      console.error(resp.data)
      setTopMentions([])
    }
  }

  const fetchNotes = async q => {
    const resp = await httpClient.get(`/note/?query=${encodeURIComponent(q)}`)
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

  const fetchAll = (q) => {
    fetchTopMentions(q)
    fetchTopTags(q)
    fetchNotes(q)
  }

  useEffect(() => {
    fetchAll(query);
  }, [])

  return (
    <div style={{ paddingBottom: 4, position: "relative" }} >
      
      <CreateModal
        isOpen={isModalOpen}
        closeModal={() => setModalOpen(false)}
      />
      
      <div className="g-btn"
        style={{
          position: "absolute", top: 8, left: 8,
        }}
        onClick={() => setModalOpen(true)}
      >
        create
      </div>

      <br />
      
      <div style={{ display: "flex", justifyContent: "center" }} >
        
        <input
          className="g-inp"
          type="text"
          value={query}
          style={{margin: 1 }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              fetchAll(query)
            };
          }}
          onChange={e => {
            setQuery(e.target.value)
          }} 
          
          />
        <button className="g-btn" style={{margin: 1}} onClick={() => {
          fetchAll(query)
        }} >search</button>
        
        <button
          disabled={!query}
          style={{cursor: !query ? "no-drop" : "pointer", margin: 1}}
          className="g-btn"
          onClick={() => {
            if (!query) return
            setQuery("")
            fetchAll("")
          }}>
          clear filters
          
          </button>
        
        
      </div>

      <br />
      <div style={{ padding: "0 8px" }} >
        {topTags.map((tag, index, arr) => {
          return (
            <span key={index} >
              <span
                style={{ color: colors[index % colors.length], cursor: "pointer" }}
                onClick={() => {
                  const newValue = query + " " + tag.name
                  setQuery(newValue)
                  fetchAll(newValue)
                }}
              > {tag.name} ({tag.usage_count}) </span>
              <span className="bg-w"> {index < arr.length - 1 ? "|" : ""} </span>
            </span>
          )
        })}
      </div>
      <div style={{ padding: "0 8px" }} >
        {topMentions.map((mention, index, arr) => {
          return (
            <span key={index} >
              <span
                style={{ color: colors[(index + topTags.length) % colors.length], cursor: "pointer" }}
                onClick={() => {
                  const newValue = query + " @" + mention.name
                  setQuery(newValue)
                  fetchAll(newValue)
                }}
              > @{mention.name} ({mention.usage_count})
              </span>
              <span className="bg-w"> {index < arr.length - 1 ? "|" : ""} </span>
            </span>
          )
        })}
      </div>
      <br />

    <Notes notes={notes} />

    </div>
  )
}