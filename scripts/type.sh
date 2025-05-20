#!/usr/bin/env sh

export PYTHONPATH="."

echo "Checking backend"
mypy --check-untyped-defs --ignore-missing-imports backend/src/*

echo "Checking tests"
mypy --ignore-missing-imports test/*.py
