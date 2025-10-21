"""Custom exception hierarchy for the garage workflow engine."""

from __future__ import annotations


class WorkflowError(Exception):
    """Base class for workflow related errors."""


class PermissionError(WorkflowError):
    """Raised when a user is not allowed to perform an action."""


class ValidationError(WorkflowError):
    """Raised when provided data does not meet validation rules."""


class InvalidTransitionError(WorkflowError):
    """Raised when a state transition is not permitted."""
