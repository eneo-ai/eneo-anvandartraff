# Running a published flow

A flow is a multi-step pipeline built in Eneo, for example "transcribe a
recording, then write meeting notes". An application can start a run of a
published flow and fetch the result.

Flows are a preview feature. They exist on the workshop environment
(`eneo-modules.sundsvall.dev`) but not in Eneo 2.3, so check that the
installation has them before promising the user anything:

```bash
python3 <this-skill-folder>/scripts/eneo_spec.py search flows/
```

No results means the installation has no flows API.

## Sequence

A flow describes its own inputs, so a client asks first and submits second.
Pull the exact request and response shapes with `eneo_spec.py show` as you go;
the operation descriptions in the specification are detailed.

| Step | Call | Purpose |
| --- | --- | --- |
| 1 | `GET /api/v1/flows/?published_only=true` | Find the flow. A service key must also send the `space_id` it is scoped to. |
| 2 | `GET /api/v1/flows/{id}/run-contract/` | Learn the form fields, which steps need files, accepted file types and the published version. |
| 3 | `POST /api/v1/flows/{id}/steps/{step_id}/runtime-files/` | Upload each required file as multipart. Set the part's content type to one the contract accepts. |
| 4 | `POST /api/v1/flows/{id}/runs/` | Start the run with the form values and file ids. Returns the run with its `id`. |
| 5 | `GET /api/v1/flows/{id}/runs/{run_id}/status/` | Poll until the status is no longer `queued` or `running`. |
| 6 | `GET /api/v1/flows/{id}/runs/{run_id}/` | Read `result` once the status is `completed`. |

Details that are easy to miss:

- Send `expected_flow_version` with the `published_flow_version` from the
  contract, so a run is not started against a flow that changed meanwhile.
- Form values go in `input_payload_json`; file ids go in
  `step_inputs[step_id].file_ids`.
- Poll gently: about every 2 seconds for the first half minute, then every 5,
  then every 15.
- `awaiting_review` means a person must approve a step in Eneo before the run
  continues. Tell the user instead of polling forever.
- Statuses `completed`, `failed` and `cancelled` are final.
- Files a run produces are listed in `result_files` and fetched through
  `POST /api/v1/flows/{id}/runs/{run_id}/artifacts/{file_id}/signed-url/`.
- A key with fine-grained resource permissions needs `flows` set explicitly, or
  every flow call is refused with `insufficient_resource_permission`.
