import { useState } from "react";
import { useNavigate } from "react-router";
import httpClient from "../../libs/api/httpClient";
import toastMaker from "../../libs/utils/custom-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import MentionTextarea from "./text-area";

export default function CreateNote() {
  const navigate = useNavigate();

  const [content, setContent] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const submit = async () => {
    if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      return toastMaker.error("time is not valid");
    }

    try {
      const resp = await httpClient.post("/note/", {
        content,
        date: selectedDate.toISOString(),
      });

      if (resp.status === 200) {
        toastMaker.success("post created");
        return navigate(0);
      }

      console.log(resp.data);
      toastMaker.error("something went wrong");
    } catch (error) {
      console.error(error);
      toastMaker.error("something went wrong");
    }
  };

  function formatDateTime(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    const pad = (n: number) => n.toString().padStart(2, "0");

    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const year = date.getFullYear();

    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${month}-${day}-${year} ${hours}:${minutes}`;
  }

  return (
    <div style={{ padding: 8 }}>
      <MentionTextarea value={content} setValue={setContent} />
      <DatePicker
        selected={selectedDate}
        onChange={(date: Date | null) => date && setSelectedDate(date)}
        calendarClassName="evil-terminal-calendar"
        dayClassName={() => "evil-terminal-day"}
        customInput={<button className="g-btn">{formatDateTime(selectedDate)}</button>}
        withPortal
        showTimeSelect
        timeIntervals={5}
      />

      <button className="g-btn" onClick={submit}>
        submit
      </button>
    </div>
  );
}
