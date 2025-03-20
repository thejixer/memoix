
import { useState } from "react"
import httpClient from "../../utils/http"
import { useNavigate } from "react-router";
import toastMaker from "../../utils/custom-toast";

function validateAmount(amount) {
  return /^\d{1,15}(\.\d{1,2})?$/.test(amount);
}

export default () => {
  const navigate = useNavigate();

  const [content, setContent] = useState("")
  const [amount, setAmount] = useState("")

  const submit = async () => {

    if (!content) return toastMaker.error("enter content please")
    if (!amount || !validateAmount(amount)) return toastMaker.error("please enter a valid amount")

    const resp = await httpClient.post("/expense/", {
      content,
      amount,
      date: new Date().toISOString()
    })

    if (resp.status == 200) {
      toastMaker.success("finance created")
      return navigate(0)
    }

    toastMaker.error("something went wrong")
  }

  return (
    <div style={{ padding: 8 }} >
      <span className="cg" > amount </span>
      <input
        type="text"
        className="g-inp"
        value={amount}
        placeholder="in tomans"
        onChange={e => {
          const newValue = e.target.value
          if (/^(\d{1,15}(\.\d{0,2})?)?$/.test(newValue)) setAmount(newValue)
        }}
        autoFocus
      />
      <textarea
        rows={10}
        cols={80}
        style={{ maxWidth: "90%" }}
        value={content}
        onChange={e => setContent(e.target.value)}
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