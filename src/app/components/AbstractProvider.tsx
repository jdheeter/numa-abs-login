"use client"

import { QueryClient } from "@tanstack/react-query"
import { abstract } from "viem/chains"
import { AbstractWalletProvider } from "@abstract-foundation/agw-react"

export default function AbstractProvider({ children }: { children: React.ReactNode }) {
  return <AbstractWalletProvider chain={abstract}>{children}</AbstractWalletProvider>
}
