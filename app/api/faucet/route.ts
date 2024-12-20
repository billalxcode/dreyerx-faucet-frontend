import { FAUCET_ADDRESS, SIGNER_PRIVATE_KEY } from "@/config/constants"
import { testnet, wagmiAdapter } from "@/config/wagmi"
import { NextResponse } from "next/server"
import { ContractFunctionExecutionError, createWalletClient, Hex, http, isAddress } from "viem"
import { getBalance } from 'wagmi/actions'
import FaucetArtifacts from '@/config/artifacts/faucet.json'
import { privateKeyToAccount } from 'viem/accounts'

if (!SIGNER_PRIVATE_KEY) {
    throw new Error('Signer private key is not defined in the environment variables.');
}

export type ResponseData = {
    status: string,
    message: string,
    data?: {
        tx: string
    }
}

const client = createWalletClient({
    chain: testnet,
    transport: http(),
    account: privateKeyToAccount(SIGNER_PRIVATE_KEY as Hex)
})

export async function POST(
    request: Request
) {
    try {
        const balance = await getBalance(wagmiAdapter.wagmiConfig, {
            address: FAUCET_ADDRESS
        })
        const { address } = await request.json()

        if (typeof address === 'undefined') {
            return NextResponse.json({
                status: 'error',
                message: 'address is required'
            })
        }

        const isValid = isAddress(address)
        if (!isValid) {
            return NextResponse.json({
                status: 'error',
                message: 'invalid address format'
            })
        }

        if (balance.value < BigInt(5)) {
            return NextResponse.json({
                status: 'error',
                message: 'insufficient faucet address balance'
            })
        }
        const tx = await client.writeContract({
            address: FAUCET_ADDRESS as `0x${string}`,
            abi: FaucetArtifacts.abi,
            functionName: 'request',
            args: [
                address
            ]
        })

        return NextResponse.json({
            status: 'ok',
            message: 'successfully to request faucet',
            data: {
                tx
            }
        })
    } catch (error) {
        console.error("Error while executing contract function:", error);
        if (error instanceof ContractFunctionExecutionError) {
            return NextResponse.json({
                status: 'error',
                message: error.shortMessage,
                addr: FAUCET_ADDRESS
            });
        } else if (error instanceof Error) {
            return NextResponse.json({
                status: 'error',
                message: error.message,
                addr: FAUCET_ADDRESS
            });
        } else {
            return NextResponse.json({
                status: 'error',
                message: 'An unknown error occurred'
            });
        }
    }
}