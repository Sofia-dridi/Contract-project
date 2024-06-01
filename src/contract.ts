import { NearBindgen, call, view, near, assert } from 'near-sdk-js';

// Define data structures to store patient and appointment information
class Patient {
    name: string;
    age: number;
    balance: bigint;

    constructor(name: string, age: number, balance: bigint) {
        this.name = name;
        this.age = age;
        this.balance = balance;
    }
}

class Appointment {
    patientId: string;
    date: string;
    doctor: string;
    fee: bigint;

    constructor(patientId: string, date: string, doctor: string, fee: bigint) {
        this.patientId = patientId;
        this.date = date;
        this.doctor = doctor;
        this.fee = fee;
    }
}

@NearBindgen({})
class PatientContract {
    patients: Map<string, Patient>;
    appointments: Appointment[];

    constructor() {
        this.patients = new Map<string, Patient>();
        this.appointments = [];
    }

    // Helper methods for persistent storage
    savePatients() {
        near.storageWrite("patients", JSON.stringify(Array.from(this.patients.entries())));
    }

    loadPatients() {
        const patientsRaw = near.storageRead("patients");
        if (patientsRaw) {
            this.patients = new Map<string, Patient>(JSON.parse(patientsRaw));
        }
    }

    saveAppointments() {
        near.storageWrite("appointments", JSON.stringify(this.appointments));
    }

    loadAppointments() {
        const appointmentsRaw = near.storageRead("appointments");
        if (appointmentsRaw) {
            this.appointments = JSON.parse(appointmentsRaw);
        }
    }

    @call({})
    registerPatient({ name, age }: { name: string, age: number }): void {
        this.loadPatients();
        const patientId = near.signerAccountId();
        if (!this.patients.has(patientId)) {
            this.patients.set(patientId, new Patient(name, age, BigInt(0)));
            this.savePatients();
        }
    }

    @call({})
    scheduleAppointment({ patientId, date, doctor, fee }: { patientId: string, date: string, doctor: string, fee: string }): void {
        this.loadPatients();
        this.loadAppointments();
        if (this.patients.has(patientId)) {
            let patient = this.patients.get(patientId)!;
            const feeBigInt = BigInt(fee);
            assert(patient.balance >= feeBigInt, "Insufficient balance to schedule appointment");
            patient.balance -= feeBigInt;
            this.patients.set(patientId, patient);
            this.appointments.push(new Appointment(patientId, date, doctor, feeBigInt));
            this.savePatients();
            this.saveAppointments();
        } else {
            assert(false, "Patient not registered");
        }
    }

    @view({})
    getPatient({ patientId }: { patientId: string }): Patient | null {
        this.loadPatients();
        return this.patients.get(patientId) || null;
    }

    @view({})
    getAppointments({ patientId }: { patientId: string }): Appointment[] {
        this.loadAppointments();
        return this.appointments.filter(appointment => appointment.patientId === patientId);
    }

    @call({})
    deposit(): void {
        this.loadPatients();
        const amount = BigInt(near.attachedDeposit().toString());
        const patientId = near.signerAccountId();
        if (this.patients.has(patientId)) {
            let patient = this.patients.get(patientId)!;
            patient.balance += amount;
            this.patients.set(patientId, patient);
            this.savePatients();
        }
    }

    @call({})
    withdraw({ amount }: { amount: string }): void {
        this.loadPatients();
        const amountBigInt = BigInt(amount);
        const patientId = near.signerAccountId();
        if (this.patients.has(patientId)) {
            let patient = this.patients.get(patientId)!;
            assert(patient.balance >= amountBigInt, "Insufficient balance");
            patient.balance -= amountBigInt;
            this.patients.set(patientId, patient);
            // Instead of near.promiseBatchCreate, we use the correct API for transferring tokens
            const promise = near.promiseBatchCreate(patientId);
            near.promiseBatchActionTransfer(promise, amountBigInt);
            this.savePatients();
        }
    }
}
