import { useEffect, useMemo } from "react"
import { useMutation } from "@tanstack/react-query"
import { post } from "../../libs/api/requestHandler"
import { Routes } from "../../libs/api/routes"

export default function RecentExpenses() {
  const { minDateISO, maxDateISO } = useMemo(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)
    return {
      minDateISO: thirtyDaysAgo.toISOString(),
      maxDateISO: today.toISOString(),
    }
  }, [])

  const dailyExpensesMutation = useMutation({
      mutationKey: ["recent-expenses"],
      mutationFn: (body: TServices.DailyExpenseBody) => post<TServices.DailyExpenseBody, any>(Routes.EXPENSE_DAILY, body),
      onSuccess: (resp) => {
        if (resp.status !== 200) {
          console.log(resp.data)
          return
        }
        console.log(resp.data)
      },
      onError: (err) => {
        console.error(err)
      },
    })

  useEffect(() => {
    dailyExpensesMutation.mutate({
      min_date: minDateISO,
      max_date: maxDateISO,
    })
  }, [minDateISO, maxDateISO])

  return <div> hello </div>
}