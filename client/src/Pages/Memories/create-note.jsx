
import { useState } from "react"
import httpClient from "../../utils/http"
import { useNavigate } from "react-router";
import toastMaker from "../../utils/custom-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import MentionTextarea from "./text-area";

export default () => {
  const navigate = useNavigate();

  const [content, setContent] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date());

  const submit = async () => {

    if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) return toastMaker.error("time is not valid")

    const resp = await httpClient.post("/note/", {
      content,
      date: new Date(selectedDate).toISOString()
    })

    if (resp.status == 200) {
      toastMaker.success("post created")
      return navigate(0)
    }

    console.log(resp.data)
    toastMaker.error("something went wrong")
  }

  function formatDateTime(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    const pad = (n) => n.toString().padStart(2, "0");

    const month = pad(date.getMonth() + 1); // months are 0-based
    const day = pad(date.getDate());
    const year = date.getFullYear();

    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${month}-${day}-${year} ${hours}:${minutes}`;
  }

  return (
    <div style={{ padding: 8 }} >
      <MentionTextarea
        value={content} 
        setValue={setContent}
      />
      <DatePicker
        selected={selectedDate}
        onChange={(date) => setSelectedDate(date)}
        calendarClassName="evil-terminal-calendar"
        // wrapperClassName="evil-terminal-wrapper"
        dayClassName={() => "evil-terminal-day"}
        customInput={<button className="g-btn"> {formatDateTime(selectedDate)} </button>}
        withPortal
        showTimeSelect   // 👈 enables the time picker
        timeIntervals={5}
      />

      <button
        className="g-btn"
        onClick={() => submit()}
      >submit</button>
    </div>
  )

}