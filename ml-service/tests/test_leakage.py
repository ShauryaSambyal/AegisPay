"""Leakage and reproducibility guards."""

from __future__ import annotations

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

from app import config
from src import data, features, models


def test_feature_names_exclude_labels_and_scenario():
    forbidden = {"label", "labelSource", "scenario", "isInjectedTypology", "isBettingFront"}
    assert not (set(features.FEATURE_NAMES) & forbidden)


def test_model_columns_are_exactly_the_declared_features(dataset):
    columns = models.feature_columns(dataset)
    assert columns == [name for name in features.FEATURE_NAMES if name in dataset.columns]
    assert "label" not in columns


def test_shuffled_labels_destroy_separation(dataset):
    """If features leaked the label, a model on shuffled labels would still score.

    We shuffle the training labels, fit the same simple learner and check the
    held-out AUC collapses to chance (0.5 +/- 0.3).
    """
    columns = models.feature_columns(dataset)
    frame = dataset.reset_index(drop=True)
    rng = np.random.default_rng(7)
    train_index, test_index = train_test_split(
        frame.index.to_numpy(), test_size=0.3, random_state=7, stratify=frame["label"]
    )
    train, test = frame.loc[train_index], frame.loc[test_index]
    if train["label"].nunique() < 2 or test["label"].nunique() < 2:
        return

    shuffled = train.copy()
    shuffled["label"] = rng.permutation(shuffled["label"].to_numpy())
    model = LogisticRegression(max_iter=500)
    model.fit(shuffled[columns], shuffled["label"])
    probabilities = model.predict_proba(test[columns])[:, 1]
    auc = roc_auc_score(test["label"], probabilities)
    assert 0.2 <= auc <= 0.8, f"shuffled-label AUC {auc:.3f} suggests target leakage"


def test_generator_is_deterministic(merchants, transactions):
    again = data.generate_transactions(merchants)
    assert data.deterministic_fingerprint(again) == data.deterministic_fingerprint(transactions)
    assert len(again) == len(transactions)


def test_generator_seed_changes_data(merchants):
    other = data.generate_transactions(merchants, seed=config.SEED + 1)
    baseline = data.generate_transactions(merchants)
    assert data.deterministic_fingerprint(other) != data.deterministic_fingerprint(baseline)


def test_windows_have_both_classes(windows):
    assert windows["label"].nunique() == 2
    positives = windows[windows["label"] == 1]
    assert positives["scenario"].isin({"drift", "syndicate"}).all()


def test_labels_come_from_scenario_not_features(windows, dataset):
    merged = dataset.merge(
        windows[["merchantId", "windowSeq", "label"]], on=["merchantId", "windowSeq"], suffixes=("", "_window")
    )
    assert (merged["label"] == merged["label_window"]).all()
    assert set(dataset["labelSource"].unique()) <= {"scenario_parameter", "normal_control"}
