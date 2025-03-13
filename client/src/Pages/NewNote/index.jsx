import { useState } from "react"
import httpClient from "../../utils/http"
import { useNavigate } from "react-router";
import toastMaker from "../../utils/custom-toast";

export default () => {
  const navigate = useNavigate();

  const [content, setContent] = useState("")

  const submit = async () => {
    const resp = await httpClient.post("/note/", {
      content,
      date: new Date().toISOString()
    })

    if (resp.status == 200) {
      toastMaker.success("post created")
      return navigate("/dashboard")
    }

    console.log(resp.data)
    toastMaker.error("something went wrong")
  }

  return (
    <div style={{ padding: 8 }} >
      <textarea
        rows={10}
        cols={80}
        style={{maxWidth: "90%"}}
        value={content}
        onChange={e => setContent(e.target.value)}
        autoFocus
        className="g-inp"
      />
      <br />
      <button
        className="g-btn"
        onClick={() => submit()}
      >submit</button>
    </div>
  )

}