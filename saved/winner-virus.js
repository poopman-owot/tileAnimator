(function(){
const str = '[{"data":"\\u001bx┏⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸┓⃸   \\n┃⃸⚠⃸ WINNER! \\u001bFff0000X⃸\\u001bx┃⃸   \\n┣⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸┫⃸   \\n┃⃸YOU WON $50┃⃸   \\n┃⃸CLAIM PRIZE┃⃸   \\n┃⃸  [⃸ ⃲O⃺K⃺!⃺ ⃲]⃸  ┃⃸   \\n┗⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸┛⃸   \\n                ","src":"data:image/png;base64,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"},{"data":"\\u001bx                \\n┏⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸┓⃸   \\n┃⃸⚠⃸ WINNER! \\u001bFff0000X⃸\\u001bx┃⃸   \\n┣⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸┫⃸   \\n┃⃸YOU WON $50┃⃸   \\n┃⃸CLAIM PRIZE┃⃸   \\n┃⃸  [⃸ ⃲O⃺K⃺!⃺ ⃲]⃸  ┃⃸   \\n┗⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸┛⃸   ","src":"data:image/png;base64,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"},{"data":"\\u001bx                \\n   ┏⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸┓⃸\\n   ┃⃸⚠⃸ WINNER! \\u001bFff0000X⃸\\u001bx┃⃸\\n   ┣⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸┫⃸\\n   ┃⃸YOU WON $50┃⃸\\n   ┃⃸CLAIM PRIZE┃⃸\\n   ┃⃸  [⃸ ⃲O⃺K⃺!⃺ ⃲]⃸  ┃⃸\\n   ┗⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸┛⃸","src":"data:image/png;base64,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"},{"data":"\\u001bx   ┏⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸┓⃸\\n   ┃⃸⚠⃸ WINNER! \\u001bFff0000X⃸\\u001bx┃⃸\\n   ┣⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸┫⃸\\n   ┃⃸YOU WON $50┃⃸\\n   ┃⃸CLAIM PRIZE┃⃸\\n   ┃⃸  [⃸ ⃲O⃺K⃺!⃺ ⃲]⃸  ┃⃸\\n   ┗⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸━⃸┛⃸\\n                ","src":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACQCAYAAACPtWCAAAAAAXNSR0IArs4c6QAAEC9JREFUeF7tnWuIVVUUx9eYA2XW5LsIhqaQLCz9kJUWNPXBntOH+iCMBqmUjywN0sys7CW9Y3o3k33QCsRHXypngrJIpVQKE4nA7EWQZoph5YOa+O9pDfvu2efsfc49d/a5564L0XjvPnvv81+/s/bjrLNOXXd3dzfJRxQIpECdABhIeWlWKSAACghBFRAAg8ovjQuAwkBQBQTAoPJL4wKgMBBUgeAA/vnnn7Rq1Sratm0bmTtCf//9N9XV1dGgQYNiRfrrr7/U71KuVKaQusCWJ510UkmH8O+pU6fSxIkTlV1zsQr+448/6P7776eXXnqpD2SjRo1S3+3duzcWQClnlydvuowcOZLa29uppaWFBgwYIABGUZ03w5n9rNb+5RbApUuX0osvvqh0vvPOO2n8+PHKRR86dEh919DQEOsBpZxdnjzocuTIEVqzZg1t3LiRcgsgD8G2DgadIUvjZSugT7EEwLLllAqSKiAAJlVMymeqgACYqZxSWVIFBMCkikn5TBUQADOVUypLqkDuATxw4ADNnz+f3nrrLRoyZAg9//zzdMstt/RuVCY9YSmfLwVc9g1+K+7gwYO0YMECWrlyJQ0dOpTa2tqotbVVAMwXR6l747JvcABdLtp25r/88gvdd999NGbMGAWv6x5wavXkwLIVcNm36gA8fvy48pZz586lc845hzo6OmjSpEm9N7fLVkwqyFSBwgH47bff0h133EEfffSREgp/P/roo2r+KB+3AtAKnwceeMBdOIMShQIQ4VkvvPACvfvuu+re8Z49e5SQzzzzDF1//fV0wgknOCWDAR588EFV7uqrr6a3336bOjs7adq0aeq7cePG0erVq+ncc88lwD5lyhTasWNHSb183LBhw9TxOFY/bvPmzXT55Zf3HrNp0yb64YcfvMoNHz7c2maavtnEwPmfffbZKiwq8Qdhb7fdRvTOOz2HXnIJ0XvvEf32G9G11xL9+GPP9ytWEM2Yof4sDICIL0PM4O23364WK7t27SJEhZx44ol01llnqdXzmWee6dQUcCD+EOXNeDXAxFCbFeE3tHPZZZf1aQN14oI47bTTSupFG9ddd52CGR/fcr///ju98sordM8995T00azPVi7u/NCHsgDk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"}]'
importFrames(JSON.parse(str));
})();