import { useEffect } from "react"
import httpClient from "../../libs/api/httpClient";




export default function RecentExpenses ()  {

  useEffect(() => {
    (async () => {

      const today = new Date(); // Get today's date
      const sevenDaysAgo = new Date(today); // Create a copy of today's date
      sevenDaysAgo.setDate(today.getDate() - 30); // Subtract 30 days

      const resp = await httpClient.post("/expense/daily", {
        'min_date': sevenDaysAgo.toISOString(),
        'max_date': today.toISOString()
      })
      if (resp.status != 200) {
        return console.log(resp.data)
      }
      console.log(resp.data)
    })();
  }, [])

  return (
    <div> hello </div>
  )
}