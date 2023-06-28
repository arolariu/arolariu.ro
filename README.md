# arolariu.ro

The `arolariu.ro` monorepo contains the open-source code for the different services and workers that are running under the domain umbrella.

Currently, there are three active websites that are using this repository:

- `about.arolariu.ro` - personal blog where I, the author, can post my thoughts and ideas.
- `docs.arolariu.ro` - website that uses `DocFX` to aggregate all the public APIs in this repository, for public consumption.
- `api.arolariu.ro` - front-facing, public API. 

---

## CI/CD status:

All of the above described platforms are leveraging GitHub Actions to promote a CI/CD pipeline for their own consumption.

### API Status: [![API platform (api.arolariu.ro) deployment](https://github.com/arolariu/arolariu.ro/actions/workflows/api.arolariu.ro.yml/badge.svg?branch=main)](https://github.com/arolariu/arolariu.ro/actions/workflows/api.arolariu.ro.yml)

### Docs Status: [![Docs platform (docs.arolariu.ro) deployment](https://github.com/arolariu/arolariu.ro/actions/workflows/docs.arolariu.ro.yml/badge.svg?branch=main)](https://github.com/arolariu/arolariu.ro/actions/workflows/docs.arolariu.ro.yml)

### About Status: [![About platform (about.arolariu.ro) deployment](https://github.com/arolariu/arolariu.ro/actions/workflows/about.arolariu.ro.yml/badge.svg?branch=main)](https://github.com/arolariu/arolariu.ro/actions/workflows/about.arolariu.ro.yml)
