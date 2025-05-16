# Contributing to AROLARIU.RO

First off, thank you for considering contributing to `arolariu.ro`! It's people like you that make open source great.

## Where do I go from here?

If you've noticed a bug or have a feature request, [make one](https://github.com/arolariu/arolariu.ro/issues/new/choose)! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

If you have a general question, feel free to reach out or start a discussion.

## Fork & create a branch

If this is something you think you can fix, then fork `arolariu.ro` and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```bash
git checkout -b 325-add-japanese-translations
```

## Get the test suite running

Make sure you're familiar with the project structure and how to run tests. Details for each sub-project can be found in their respective `README.md` files (if available) or by inspecting their `package.json` or `.csproj` files.

## Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first :smile_cat:

## Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with `arolariu.ro`'s master branch:

```bash
git remote add upstream git@github.com:arolariu/arolariu.ro.git
git checkout main
git pull upstream main
```

Then update your feature branch from your local copy of master, and push it!

```bash
git checkout 325-add-japanese-translations
git rebase main
git push --force-with-lease origin 325-add-japanese-translations
```

Finally, go to GitHub and make a Pull Request.

## Keeping your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed, and that you need to update your branch so it's easier to merge.

To learn more about rebasing in Git, there are a lot of good resources but here's the suggested workflow:

```bash
git checkout 325-add-japanese-translations
git pull --rebase upstream main
git push --force-with-lease origin 325-add-japanese-translations
```

## Code Style

Please ensure your code adheres to the project's coding standards. We use `.editorconfig` to maintain consistent coding styles. Linters and formatters may be run as part of the CI process.

Thank you for contributing!
