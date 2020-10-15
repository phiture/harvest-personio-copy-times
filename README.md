# harvest-personio-copy-times
Copy employees' time entries from Harvest into Personio

[github.com/phiture/harvest-personio-copy-times 👉](https://github.com/phiture/harvest-personio-copy-times)

## Contents
- [Requirements](#requirements)
- [Example Usage](#example-usage)
- [Arguments](#arguments)
    - [From and To Dates](#from-and-to-dates)
    - [People to Include and People to Exclude](#people-to-include-and-people-to-exclude)
    - [.env Path](#env-path)
    - [Default Arguments](#default-arguments)
- [For Developers](#developers-abstract)
    - [General Architecture](#general-architecture)
    - [Dockerized Cron Job](#dockerized-cron-job)

## Requirements
- Deno 1.4.0 or above.
[How to install 👉](https://deno.land/#installation)

## Example Usage
```shell
./index.sh 2020-01-01 _ me  # Copy all of your times on and after 2020-01-01
```

You can also run the underlying deno app directly like:
```shell
deno run --allow-env --allow-net=api.personio.de,api.harvestapp.com --allow-read=.env,.env.example,.env.defaults src/index.ts ...arguments
```
however due to deno's strict security this line is cumbersome. `index.sh` is provided for convenience.

## Arguments
`index.ts` and `index.sh` take 5 command line arguments, in the following order:
```shell
./index.sh fromDate toDate includePeople excludePeople dotEnvPath
```

### From and To Dates
Inclusive upper and lower date bounds.
Both should be in format `yyyy-mm-dd` and either or both can be replaced by a `_` meaning “limitless”.

Examples:
- `2020-01-01 2020-01-04` will copy all time entries on and between January 1st and January 4th.
- `2020-01-01 2020-01-01` will copy only time entries on January 1st.
- `2020-01-01 _` will copy all time entries on or after January 1st.
- `_ 2020-01-04` will copy all time entries before and on January 4th.
- `_ _` will copy all time entries.

### People to Include and People to Exclude
List of employees for whom times should be copied.
People to Exclude is optional and when present overrides People to Include.
Both values should be a comma separated list of first and last names with all spaces removed or `all`.
The value `me` is also acceptable for both and means the employee whose Harvest personal access token has been provided to the script.

Examples:
- `all` will copy time entries for everyone.
- `all AdaLovelace` will copy time entries for everyone except Ada Lovelace.
- `AdaLovelace` will copy times for only Ada Lovelace.
- `AdaLovelace,SteveJobs,ChimamandaAdichie AdaLovelace` although rather redundant, will copy time entries for Steve Jobs and Chimamanda Adichie.
- `me` will copy times for whoever's Harvest personal access token is being used.
- `all me` will copy times for eveyone except me.

### .env Path
Optional path to `.env` file. Defaults to `./.env`.

### Default Arguments
The order of the arguments cannot be changed but one or more arguments may be left off the end.
The default arguments are:
```shell
./index.sh _ _ '' '' './.env'
```

## For Developers

### General Architecture
More information on:
[Harvest API 👉](https://help.getharvest.com/api-v2/) |
[Personio API 👉](https://developer.personio.de/)

This app works by making a request to `api.harvestapp.com/v2/time_entries`,
concatnating the users' first and last names, matching these names against
a list of employee names fetched from `api.personio.de/v1/company/employees`
and adding corresponding attendances with `api.personio.de/v1/company/attendances`.
Functionality is divided into
a [Personio module](./src/personio/),
a [Harvest module](./src/harvest/),
and helper functions for processing data correctly according to the passed arguments
in [utils.ts](./src/utils.ts).
[index.ts](./src/index.ts) is the entrypoint to the app,
executes immediately when run, and contains all the high level functionality.

### Dockerized Cron Job
```shell
echo HOST_ROOT_DIR=$(pwd) >> .env
docker-compose up -d
```
Look into [cronfile](./cronfile) to change the cron job frequency.
