namespace TServices {
    type RequestOtpBody = {
        phone_number: string
    }

    type VerifyOtpBody = {
        phone_number: string
        otp: string
    }

    type CreatePersonBody = {
        name: string
    }

    type DailyExpenseBody = {
        min_date: string
        max_date: string
    }

    type CreateExpenseBody = {
        content: string
        amount: string
        date: string
    }
}