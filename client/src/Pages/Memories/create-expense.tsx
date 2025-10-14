import { useState } from "react";
import { useNavigate } from "react-router";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toastMaker from "../../libs/utils/custom-toast";
import { Button, Input } from "../../ui/primitives";
import MentionTextarea from "./text-area";
import { useMutation } from "@tanstack/react-query";
import { post } from "../../libs/api/requestHandler";
import { Routes } from "../../libs/api/routes";

function validateAmount(amount: string | number) {
  return /^\d{1,15}(\.\d{1,2})?$/.test(String(amount));
}

export default function CreateExpense() {
  const navigate = useNavigate();

  const [content, setContent] = useState<string>("");
  const [amount, setAmount] = useState<string | number>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const createExpenseMutation = useMutation({
    mutationFn: (body: TServices.CreateExpenseBody) =>
      post<TServices.CreateExpenseBody, any>(Routes.EXPENSE_CREATE, body),
    onSuccess: (resp) => {
      if (resp.status === 200) {
        toastMaker.success("finance created");
        return navigate(0);
      }
      toastMaker.error("something went wrong");
    },
    onError: () => {
      toastMaker.error("network error");
    },
  });

  const submit = async () => {
    if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      return toastMaker.error("time is not valid");
    }

    if (!content) return toastMaker.error("enter content please");
    if (!amount || !validateAmount(amount)) return toastMaker.error("please enter a valid amount");

    await createExpenseMutation.mutateAsync({
      content,
      amount: String(amount),
      date: selectedDate.toISOString(),
    });
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
      <span className="cg">Amount</span>
      <Input
        type="text"
        placeholder="in tomans"
        value={amount !== "" ? new Intl.NumberFormat("en-US").format(Number(amount)) : ""}
        onChange={(e) => {
          const raw = e.target.value.replace(/,/g, "");
          if (/^(\d{1,15}(\.\d{0,2})?)?$/.test(raw)) {
            setAmount(raw === "" ? "" : Number(raw));
          }
        }}
        autoFocus
      />{" "}
      tomans
      <MentionTextarea value={content} setValue={setContent} />
      <DatePicker
        selected={selectedDate}
        onChange={(date: Date | null) => date && setSelectedDate(date)}
        calendarClassName="evil-terminal-calendar"
        dayClassName={() => "evil-terminal-day"}
        customInput={<Button>{formatDateTime(selectedDate)}</Button>}
        withPortal
        showTimeSelect
        timeIntervals={5}
      />
      <Button onClick={submit}>
        Submit
      </Button>
    </div>
  );
}