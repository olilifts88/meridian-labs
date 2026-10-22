// Two fictional drafts of the same change: one promises too much, one is accurate.
const evidence = {
  change_id: 'feature-101',
  feature: 'CSV export',
  content_kind: 'release_note',
  stage: 'beta',
  audiences: ['pilot_group_east', 'pilot_group_west'],
  pr_urls: [
    'https://example.invalid/pr/101',
    'https://example.invalid/pr/102'
  ],
  source_urls: ['https://example.invalid/spec/csv-export']
};

const shared = {
  kind: 'release_note',
  feature: 'CSV export',
  stage: 'beta',
  citations: ['https://example.invalid/pr/101'],
  model: 'model_alpha'
};

return [
  {
    json: {
      case_id: 'beta_csv_bad',
      evidence,
      draft: {
        ...shared,
        headline: 'Export your results to CSV',
        body: 'CSV export is available to all customers. Open a report and select Export.',
        audiences: ['all_customers']
      }
    }
  },
  {
    json: {
      case_id: 'beta_csv_good',
      evidence,
      draft: {
        ...shared,
        headline: 'Export your results to CSV in the pilot',
        body: 'CSV export is available to the pilot groups. Open a report and select Export.',
        audiences: ['pilot_group_east', 'pilot_group_west'],
        citations: ['https://example.invalid/pr/101', 'https://example.invalid/spec/csv-export']
      }
    }
  }
];
