import { connect, keyStores, WalletConnection, Contract } from 'near-api-js';
import BN from 'bn.js';

const nearConfig = {
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
    keyStore: new keyStores.BrowserLocalStorageKeyStore(),
    contractName: 'your_contract_name.testnet' // Replace with your actual contract name
};

// Define the contract interface
interface MyContract extends Contract {
    registerPatient: (params: { name: string, age: number }) => Promise<void>;
    scheduleAppointment: (params: { patientId: string, date: string, doctor: string, fee: string }) => Promise<void>;
    getPatient: (params: { patientId: string }) => Promise<Patient | null>;
    getAppointments: (params: { patientId: string }) => Promise<Appointment[]>;
    deposit: () => Promise<void>;
    withdraw: (params: { amount: string }) => Promise<void>;
}

// Define data structures to match the contract
interface Patient {
    name: string;
    age: number;
    balance: string; // Use string to represent balances in NEAR
}

interface Appointment {
    patientId: string;
    date: string;
    doctor: string;
    fee: string; // Use string to represent fees in NEAR
}

// Initialize contract with the account ID and contract name
async function initContract() {
    const near = await connect({
        networkId: nearConfig.networkId,
        nodeUrl: nearConfig.nodeUrl,
        walletUrl: nearConfig.walletUrl,
        helperUrl: nearConfig.helperUrl,
        keyStore: nearConfig.keyStore
    });

    const wallet = new WalletConnection(near, 'your_app_prefix'); // Add an appropriate appKeyPrefix
    const account = wallet.account();

    const contract = new Contract(account, nearConfig.contractName, {
        viewMethods: ['getPatient', 'getAppointments'],
        changeMethods: ['registerPatient', 'scheduleAppointment', 'deposit', 'withdraw'],
    }) as MyContract;

    return { contract, wallet };
}

// Register a new patient
async function registerPatient(name: string, age: number) {
    const { contract } = await initContract();
    await contract.registerPatient({ name, age });
}

// Schedule an appointment
async function scheduleAppointment(patientId: string, date: string, doctor: string, fee: string) { // fee as string
    const { contract } = await initContract();
    await contract.scheduleAppointment({ patientId, date, doctor, fee });
}

// Get patient information
async function getPatient(patientId: string) {
    const { contract } = await initContract();
    return await contract.getPatient({ patientId });
}

// Get appointments for a specific patient
async function getAppointments(patientId: string) {
    const { contract } = await initContract();
    return await contract.getAppointments({ patientId });
}

// Example usage
(async () => {
    try {
        await registerPatient("John Doe", 30);
        await scheduleAppointment("john_doe_account_id.testnet", "2024-06-01", "Dr. Smith", "1000000000000000000000000"); // fee as string
        const patient = await getPatient("john_doe_account_id.testnet");
        console.log("Patient:", patient);
        const appointments = await getAppointments("john_doe_account_id.testnet");
        console.log("Appointments:", appointments);
    } catch (error) {
        console.error("Error:", error);
    }
})();
