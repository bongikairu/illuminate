# [![](/favicon-32x32.png) Illuminate](https://illuminate.dotasphere.com/) | A Dota 2 Match Report Data Linker

[![](https://img.shields.io/badge/discord-join-7289da)](https://discord.gg/2mBefy)

Found a bug in the website? Have a question? Please [open an issue](https://github.com/bongikairu/illuminate/issues)!

For questions about the Firefox Addon, please visit the [chakra-magic project page](https://github.com/Steffo99/chakra-magic).

## About

Illuminate is a tool to help you browse the report/commendation data exposted by Valve in response to the EU GDPR.

In its raw form, the data is messy and while reading it you might need to cross-reference a match history tool such as [OpenDota](https://github.com/odota) to fully understand it.

Illuminate fills that gap by automatically combining the report data with match data sourced from the [OpenDota API](https://docs.opendota.com/), allowing for an easier understanding.

Everything Illuminate does is entirely client-side: no data is sent to the server; everything is processed right in your browser!

## Technical details

Illuminate works in two steps:
- First, Illuminate gathers data from the GDPR page, and passes it to the static page through the anchor URL segment. ([console_script.js](/console_script.js))
- Then, the data is read and displayed to the user by the script on the static page, and the match infos are fetched through the OpenDota API. ([script.js](/script.js))

## Contribution

You're welcome to open issues or create pull requests.

Currently, there are no guidelines in place; make sure to be as detailed as possible, so the problem can be more quickly identified and fixed.

## Licensing

Illuminate is licensed under the [MIT License](/license).

Illuminate is a community tool and is not affiliated with Dota 2 or Valve Corporation.

All Dota 2 assets are property of Valve Corporation.

Illuminate uses a licensed copy of the Font Awesome Pro Icon Pack.
