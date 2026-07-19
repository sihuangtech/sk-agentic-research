import pytest
from pydantic import ValidationError

from backend.core.config import AppConfig, load_config


def test_default_config_is_valid() -> None:
    config = load_config("config.yaml")
    assert config.experiment.train_seeds
    assert set(config.experiment.train_seeds).isdisjoint(config.experiment.validation_seeds)
    assert config.workflow.human_review_before_execution is True


def test_missing_configuration_is_rejected() -> None:
    with pytest.raises(ValidationError):
        AppConfig.model_validate({"research_directions": ["test"]})


def test_held_out_seeds_cannot_overlap() -> None:
    payload = load_config("config.yaml").model_dump()
    payload["experiment"]["train_seeds"] = [1, 2]
    payload["experiment"]["validation_seeds"] = [2, 3]
    with pytest.raises(ValidationError):
        AppConfig.model_validate(payload)


def test_unknown_configuration_is_rejected() -> None:
    payload = load_config("config.yaml").model_dump()
    payload["mystery"] = True
    with pytest.raises(ValidationError):
        AppConfig.model_validate(payload)
