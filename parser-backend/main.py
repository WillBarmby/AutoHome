from command_router import CommandRouter

router = CommandRouter()

if __name__ == "__main__":
    user_input = "turn off the lights and set downstairs thermostat to 70"
    parsed_cmds = router.parse(user_input)
    print("Parsed:", parsed_cmds)

    for cmd in parsed_cmds:
        status, resp = router.execute(cmd)
        print("Executed:", cmd, "→", status, resp)

# from parser.model_parser import parse_command
# from executor import execute_command

# def main():
#     while True:
#         user_input = input("Command> ")
#         if user_input.lower() in {"exit", "quit"}:
#             break

#         parsed = parse_command(user_input)
#         if parsed:
#             for cmd in parsed:
#                 execute_command(cmd)
#         else:
#             print("⚠️ Could not parse command.")

# if __name__ == "__main__":
#     main()
