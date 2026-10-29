# COBOL Account Management

This directory documents the COBOL account-management example in `src/cobol/`. The program provides a menu for viewing a balance, crediting an account, and debiting an account.

## Source Files

| File | Purpose |
| --- | --- |
| [`main.cob`](../src/cobol/main.cob) | Runs the interactive menu, reads the user's choice, and calls `Operations` for balance, credit, or debit requests. Choice 4 exits the program; other choices display an error. |
| [`operations.cob`](../src/cobol/operations.cob) | Implements the account actions. It reads the stored balance before displaying or changing it, prompts for amounts for credits and debits, and reports the result. |
| [`data.cob`](../src/cobol/data.cob) | Owns the balance in `STORAGE-BALANCE` and exposes `READ` and `WRITE` operations through its linkage parameters. The stored balance starts at `1000.00`. |

## Account Rules and Behavior

- The program keeps one balance shared by all operations. It does not store student names, IDs, or separate balances, so it does not currently implement individual student accounts.
- The initial balance is `1000.00`. It is held in memory while the program runs; there is no file or database persistence.
- A credit adds the entered amount to the balance and stores the result.
- A debit is allowed only when the balance is greater than or equal to the entered amount. Otherwise, the program displays an insufficient-funds message and leaves the balance unchanged.
- Amount fields use `PIC 9(6)V99`, which represents up to six integer digits and two fractional digits. The program does not explicitly reject zero or negative amounts, or validate input beyond the COBOL field definitions.

## Operation Flow

`MainProgram` dispatches a six-character operation name to `Operations`. `Operations` calls `DataProgram` with `READ` to retrieve the balance and with `WRITE` to save a changed balance. `DataProgram` copies between the passed balance and its working-storage balance.

## Sequence Diagram

```mermaid
sequenceDiagram
	actor User
	participant Main as MainProgram
	participant Ops as Operations
	participant Data as DataProgram

	loop Until the user exits
		Main->>User: Display menu
		User->>Main: Enter choice
		alt View balance (choice 1)
			Main->>Ops: TOTAL
			Ops->>Data: READ
			Data-->>Ops: Current balance
			Ops-->>User: Display current balance
		else Credit account (choice 2)
			Main->>Ops: CREDIT
			Ops-->>User: Prompt for credit amount
			User->>Ops: Enter amount
			Ops->>Data: READ
			Data-->>Ops: Current balance
			Ops->>Ops: Add amount to balance
			Ops->>Data: WRITE updated balance
			Ops-->>User: Display new balance
		else Debit account (choice 3)
			Main->>Ops: DEBIT
			Ops-->>User: Prompt for debit amount
			User->>Ops: Enter amount
			Ops->>Data: READ
			Data-->>Ops: Current balance
			alt Balance covers debit
				Ops->>Ops: Subtract amount from balance
				Ops->>Data: WRITE updated balance
				Ops-->>User: Display new balance
			else Insufficient funds
				Ops-->>User: Display insufficient-funds message
			end
		else Exit (choice 4)
			Main->>Main: Stop menu loop
			Main-->>User: Display goodbye message
		else Invalid choice
			Main-->>User: Display invalid-choice message
		end
	end
```