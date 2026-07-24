use chrono::{Duration, Months, NaiveDate};

/// 根据重复规则计算下一次截止日期；若超出 recurrence_end_date 则返回 None
pub fn next_due_date(
    current: NaiveDate,
    frequency: &str,
    interval: Option<i32>,
    custom_unit: Option<&str>,
    recurrence_end: Option<NaiveDate>,
) -> Option<NaiveDate> {
    let n = interval.unwrap_or(1).max(1) as u32;
    let next = match frequency {
        "daily" => current + Duration::days(n as i64),
        "weekly" => current + Duration::weeks(n as i64),
        "biweekly" => current + Duration::weeks(2),
        "monthly" => current.checked_add_months(Months::new(n))?,
        "yearly" => current.checked_add_months(Months::new(n * 12))?,
        // 截止日期为 NaiveDate，自定义仅支持天及以上；旧数据中的 minutes/hours 按天处理
        "custom" => match custom_unit.unwrap_or("days") {
            "days" | "minutes" | "hours" => current + Duration::days(n as i64),
            "weeks" => current + Duration::weeks(n as i64),
            "months" => current.checked_add_months(Months::new(n))?,
            "years" => current.checked_add_months(Months::new(n * 12))?,
            _ => current + Duration::days(n as i64),
        },
        _ => return None,
    };

    if let Some(end) = recurrence_end {
        if next > end {
            return None;
        }
    }
    Some(next)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn d(y: i32, m: u32, day: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, day).unwrap()
    }

    #[test]
    fn daily_and_end() {
        let start = d(2026, 7, 23);
        let end = d(2026, 7, 24);
        assert_eq!(next_due_date(start, "daily", Some(1), None, Some(end)), Some(end));
        assert_eq!(next_due_date(start, "daily", Some(1), None, Some(start)), None);
    }

    #[test]
    fn interval_defaults_and_clamps() {
        let start = d(2026, 1, 1);
        assert_eq!(
            next_due_date(start, "daily", None, None, None),
            Some(d(2026, 1, 2))
        );
        assert_eq!(
            next_due_date(start, "daily", Some(0), None, None),
            Some(d(2026, 1, 2))
        );
        assert_eq!(
            next_due_date(start, "daily", Some(-3), None, None),
            Some(d(2026, 1, 2))
        );
        assert_eq!(
            next_due_date(start, "daily", Some(3), None, None),
            Some(d(2026, 1, 4))
        );
    }

    #[test]
    fn weekly_biweekly() {
        let start = d(2026, 7, 20);
        assert_eq!(
            next_due_date(start, "weekly", Some(1), None, None),
            Some(d(2026, 7, 27))
        );
        assert_eq!(
            next_due_date(start, "weekly", Some(2), None, None),
            Some(d(2026, 8, 3))
        );
        // biweekly 固定两周，忽略 interval
        assert_eq!(
            next_due_date(start, "biweekly", Some(5), None, None),
            Some(d(2026, 8, 3))
        );
    }

    #[test]
    fn monthly_year_edge() {
        let jan31 = d(2026, 1, 31);
        assert_eq!(
            next_due_date(jan31, "monthly", Some(1), None, None),
            Some(d(2026, 2, 28))
        );
        assert_eq!(
            next_due_date(d(2024, 2, 29), "yearly", Some(1), None, None),
            Some(d(2025, 2, 28))
        );
    }

    #[test]
    fn custom_units() {
        let start = d(2026, 3, 10);
        assert_eq!(
            next_due_date(start, "custom", Some(2), Some("days"), None),
            Some(d(2026, 3, 12))
        );
        assert_eq!(
            next_due_date(start, "custom", Some(2), Some("weeks"), None),
            Some(d(2026, 3, 24))
        );
        assert_eq!(
            next_due_date(start, "custom", Some(2), Some("months"), None),
            Some(d(2026, 5, 10))
        );
        assert_eq!(
            next_due_date(start, "custom", Some(1), Some("years"), None),
            Some(d(2027, 3, 10))
        );
        // 旧数据 minutes/hours 按天推进
        assert_eq!(
            next_due_date(start, "custom", Some(3), Some("hours"), None),
            Some(d(2026, 3, 13))
        );
        assert_eq!(
            next_due_date(start, "custom", Some(3), Some("minutes"), None),
            Some(d(2026, 3, 13))
        );
        assert_eq!(
            next_due_date(start, "custom", Some(1), None, None),
            Some(d(2026, 3, 11))
        );
    }

    #[test]
    fn unknown_frequency() {
        assert_eq!(next_due_date(d(2026, 1, 1), "foo", Some(1), None, None), None);
    }

    #[test]
    fn end_date_inclusive_boundary() {
        let start = d(2026, 7, 1);
        let end = d(2026, 7, 8);
        assert_eq!(
            next_due_date(start, "weekly", Some(1), None, Some(end)),
            Some(end)
        );
        assert_eq!(
            next_due_date(end, "weekly", Some(1), None, Some(end)),
            None
        );
    }
}
