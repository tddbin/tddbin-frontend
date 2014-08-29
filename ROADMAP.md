# Things came up while developing
- the approach to detecting shortcuts is completely overdone, use shiftKey, controlKey, metaKey properties of event object (will be much simpler!!!!)

# Code Editor
- write more efficient code using shortcuts, useful refactoring, etc.
- push changes automatically to github on red/green state change
- reveres mapping of test code to production code, to see where is something that is tested implemented
- collabrative editing, so everyone can use his own computer but collaborate
- time counter that shows "your tests are already RED for 23mins"
- "pair programming feauture" toggle actor icons to identify changing the driver and navigator role
- allow to use a table for simply inputting input+output data and specify the function to call, which generate test cases
  behind the scenes (e.g. for teaching (kids) how to simply program without need to learn jasmine or alikes)

# Complexity/Analysis
- show code complexity using TPP
- show coding session stats like: red-to-green time, complexity changes over time

# CodeRetreat features
- build in contraints detection, e.g. if constraint "no IFs" is selected, TDDbin will warn if violated
- build in pairing/collaboration rules, e.g. switch write access on certain conditions (ping pong, switches write access always on the next green state)
- create a kata-log, where katas can be chosen and be programmed
- maybe 1st paste kata descriptions into editor as comments
- categorize katas by levels (beginner, intermediate, refactoring, ...)
- allow users to add kata and persist them and distribute them to a coderetreat audience

# Marketing features
- provide a system of badges (or better a system of earning badges) while coding with TDDbin (e.g. http://www.openbadges.org/)
- provide a way to share the earned badges of the user. possible chanals: twitter/facebook/anySocialMedia
