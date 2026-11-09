export function ScoringMethod() {
  return (
    <details className="scoreHelp">
      <summary>Scoring method</summary>
      <p>
        A section needs at least half its questions answered and a score on
        every item. The overall estimate needs all four sections. A dash means
        there is too little graded evidence.
      </p>
      <p>
        Objective questions earn one point each, and extended responses earn up
        to five. We multiply the fraction earned by five and add one, allowing
        half a band either way for Reading and Listening and one band for
        Writing and Speaking. Full marks across a section earn 6.0. Section
        endpoints are rounded to half bands and limited to 1–6. Each section
        estimate rounds to the nearest half band. We average the four estimates
        equally and round to the nearest half band, rounding ties up. We apply
        the same rounding to the average lower and upper limits.
      </p>
      <p>
        Our section ranges are practice allowances. Their predictive accuracy
        has not been measured on real exams. ETS calibrates the difficulty of
        its own test forms.
      </p>
      <p>
        We convert both endpoints of the overall range to the 120-point scale.
        For bands 2–6 we use values observed on score reports. For 1 and 1.5 we
        use the rounded midpoint of the ETS comparison range as an
        approximation.{' '}
        <a
          href="https://www.toeflresources.com/blog/converting-between-old-1-120-and-new-1-6-toefl-scores/"
          target="_blank"
          rel="noreferrer"
        >
          Observed conversions ↗
        </a>{' '}
        <a
          href="https://www.ets.org/toefl/institutions/ibt/score-scale-update.html"
          target="_blank"
          rel="noreferrer"
        >
          ETS score comparison ↗
        </a>
      </p>
    </details>
  )
}
