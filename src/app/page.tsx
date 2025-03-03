"use client"
import { useLoginWithAbstract, useAbstractClient } from "@abstract-foundation/agw-react"
import { useAccount, useSignMessage } from "wagmi"
import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import type { SignMessageData } from "@wagmi/core/query"

export default function Home() {
  function WalletConnectionContent() {
    const { login, logout } = useLoginWithAbstract()
    const { address } = useAccount()
    const searchParams = useSearchParams()
    const [userId, setUserId] = useState<string>("")
    const [authJwt, setAuthJwt] = useState<string>("")
    const [status, setStatus] = useState<"loading" | "signing" | "success" | "error">("loading")
    const [errorMessage, setErrorMessage] = useState<string>("")
    const [redirectTimer, setRedirectTimer] = useState<number | null>(null)
    useEffect(() => {
      const userIdParam = searchParams.get("userId")
      const authJwtParam = searchParams.get("jwt")

      if (userIdParam) {
        setUserId(userIdParam)
      } else {
        setStatus("error")
        setErrorMessage("Missing userId in URL parameters")
      }
      if (authJwtParam) setAuthJwt(authJwtParam)
    }, [searchParams])

    // Auto login on page load
    useEffect(() => {
      const handleLogin = async () => {
        try {
          await login()
        } catch (err) {
          setStatus("error")
          setErrorMessage("Failed to connect Abstract wallet")
        }
      }

      handleLogin()
    }, [])

    // Create signature message that includes userId
    const getMessageToSign = () => {
      return `I am linking my Abstract wallet address ${address} to my account with ID ${userId}.`
    }

    const { signMessageAsync } = useSignMessage()

    // When we have address and userId, sign the message
    useEffect(() => {
      if (!address || !userId || status === "error" || status === "success") return

      const signAndSubmit = async () => {
        try {
          setStatus("signing")
          const message = getMessageToSign()
          const signature = await signMessageAsync({ message })
          await sendSignedMessageToBackend(signature, message)
        } catch (err) {
          console.error("Failed to sign message:", err)
          setStatus("error")
          setErrorMessage("Failed to sign message")
          logout()
        }
      }

      signAndSubmit()
    }, [address, userId])

    // Auto redirect after success
    useEffect(() => {
      if (status === "success" && !redirectTimer) {
        const timer = window.setTimeout(() => {
          window.location.href = process.env.NEXT_PUBLIC_APP_URL + "?page=profile"
        }, 3000)
        setRedirectTimer(timer)
        return () => window.clearTimeout(timer)
      }
    }, [status, redirectTimer])

    // Parse errors from API responses
    const parseError = (error: any) => {
      if (!error) return "Unknown error"

      // Strip ANSI color codes
      const stripAnsi = (str: string) => str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, "")

      if (typeof error === "string") return stripAnsi(error)
      if (error.message) return stripAnsi(error.message)
      return stripAnsi(String(error))
    }

    // Send the signed message to backend with JWT auth
    const sendSignedMessageToBackend = async (signature: SignMessageData, message: string): Promise<void> => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/linkAbstractAccount`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authJwt}`,
          },
          body: JSON.stringify({
            userId,
            address,
            signature,
            message,
          }),
        })

        const result = await response.json()

        if (result.valid) {
          setStatus("success")
        } else {
          throw new Error(result.message)
        }
      } catch (error) {
        console.error("Error:", error)
        setStatus("error")
        setErrorMessage(parseError(error))
        logout()
      }
    }

    const handleRetry = () => {
      // Clear all browser storage
      localStorage.clear()
      sessionStorage.clear()

      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
      })

      // Reload the page
      window.location.reload()
    }
    const handleReturnToNuma = () => {
      window.location.href = process.env.NEXT_PUBLIC_APP_URL + "?page=profile"
    }
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-center">Abstract Wallet Connection</h1>

          {status === "loading" && (
            <div className="text-center py-10">
              <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-lg">Linking Abstract Account...</p>
            </div>
          )}

          {status === "signing" && (
            <div className="text-center py-10">
              <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-lg">Signing message...</p>
              {address && <p className="text-sm text-gray-400 mt-2">Wallet: {address}</p>}
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-8">
              <div className="inline-block w-16 h-16 bg-green-500 rounded-full mb-4 relative">
                <svg className="absolute top-1/4 left-1/4 w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xl font-semibold mb-2">Abstract Account Linked</p>
              <p className="text-sm text-gray-400 mb-6">Redirecting in 3 seconds...</p>
              <button onClick={handleReturnToNuma} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200">
                Return to Numa
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-8">
              <div className="inline-block w-16 h-16 bg-red-500 rounded-full mb-4 relative">
                <svg className="absolute top-1/4 left-1/4 w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-xl font-semibold mb-2">Error</p>
              <p className="text-sm text-red-400 mb-6">{errorMessage}</p>
              <div className="flex flex-col space-y-3">
                <button onClick={handleRetry} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200">
                  Try Again
                </button>
                <button onClick={handleReturnToNuma} className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition duration-200">
                  Return to Numa
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
          <div className="text-center py-10">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg">Loading...</p>
          </div>
        </div>
      }
    >
      <WalletConnectionContent />
    </Suspense>
  )
}
