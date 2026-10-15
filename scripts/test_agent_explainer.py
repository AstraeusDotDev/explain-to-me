import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('agent_explainer', Path(__file__).with_name('agent-explainer.py'))
assert SPEC is not None and SPEC.loader is not None
agent = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(agent)


class AgentLauncherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR'))
        self.root = Path(self.temp.name)
        self.software = self.root / 'software'
        self.software.mkdir()
        self.workspace = self.root / 'private-workspace'
        self.workspace.mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def test_input_and_symlink_escape_are_refused_before_job_creation(self):
        outside = self.root / 'outside.md'
        outside.write_text('neutral fixture')
        link = self.workspace / 'escape.md'
        link.symlink_to(outside)
        for path in [outside, link]:
            with self.assertRaises(ValueError):
                agent.checked_source(path, self.workspace, False)
        self.assertFalse((self.workspace / '.explain-to-me').exists())

    def test_workspace_inside_software_is_refused(self):
        with self.assertRaises(ValueError):
            agent.create_job(self.software / 'private', self.software, 'test')
        self.assertFalse((self.software / 'private').exists())

    def test_unique_jobs_and_private_path_layout(self):
        one = agent.create_job(self.workspace, self.software, 'fixture')
        two = agent.create_job(self.workspace, self.software, 'fixture')
        self.assertNotEqual(one['job'], two['job'])
        for value in one.values():
            self.assertTrue(agent.within(value, self.workspace))
        self.assertFalse(one['output'].exists())

    def test_cache_symlink_escape_is_refused(self):
        (self.workspace / '.explain-to-me').symlink_to(self.software, target_is_directory=True)
        with self.assertRaises(ValueError):
            agent.create_job(self.workspace, self.software, 'test')
        self.assertFalse((self.software / 'jobs').exists())

    def test_missing_failed_or_partial_qc_is_not_success(self):
        output = self.workspace / 'output'
        output.mkdir()
        for name in agent.ARTIFACTS:
            (output / name).write_text('unit-test fixture, not actual media')
        report = {'buildId': 'unit-fixture', 'status': 'automated-checks-passed-egress-unverified', 'validation': {'automatedChecks': 'passed', 'gates': {key: True for key in agent.GATES}}, 'humanReview': {'status': 'pending'}, 'egress': {'status': 'unverified'}}
        (output / 'report.json').write_text(json.dumps(report))
        self.assertEqual(agent.validate_output(output)['humanReview'], 'pending')
        report['validation']['gates']['decoded'] = False
        (output / 'report.json').write_text(json.dumps(report))
        with self.assertRaises(ValueError):
            agent.validate_output(output)
        (output / 'audio.wav').unlink()
        with self.assertRaises(ValueError):
            agent.validate_output(output)

    def test_subprocess_failure_and_timeout_do_not_report_success(self):
        log = self.workspace / 'run.log'
        with self.assertRaises(subprocess.CalledProcessError):
            agent.run_owned([sys.executable, '-c', 'raise SystemExit(7)'], self.workspace, dict(os.environ), log, 5)
        with self.assertRaises(subprocess.TimeoutExpired):
            agent.run_owned([sys.executable, '-c', 'import time; time.sleep(10)'], self.workspace, dict(os.environ), log, 0.1)

    def test_git_identity_includes_dirty_state_and_untracked_source(self):
        subprocess.run(['git', 'init', '-q', str(self.software)], check=True)
        (self.software / 'package.json').write_text('{"version":"0.2.0"}')
        subprocess.run(['git', 'add', 'package.json'], cwd=self.software, check=True)
        subprocess.run(['git', '-c', 'user.name=Test Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture'], cwd=self.software, check=True)
        before = agent.software_identity(self.software)
        self.assertFalse(before['dirty'])
        (self.software / 'new.py').write_text('# unit-test source')
        after = agent.software_identity(self.software)
        self.assertTrue(after['dirty'])
        self.assertNotEqual(before['sourceFingerprint'], after['sourceFingerprint'])
        self.assertEqual(after['version'], '0.2.0')


if __name__ == '__main__':
    unittest.main()
