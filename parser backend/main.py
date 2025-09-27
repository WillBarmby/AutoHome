from parser.model_parser import parse_command
from executor import execute_command

def main():
    while True:
        user_input = input("Command> ")
        if user_input.lower() in {"exit", "quit"}:
            break

        parsed = parse_command(user_input)
        if parsed:
            for cmd in parsed:
                execute_command(cmd)
        else:
            print("⚠️ Could not parse command.")

if __name__ == "__main__":
    main()
