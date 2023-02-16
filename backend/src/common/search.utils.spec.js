const searchUtils = require('./search.utils');
const {toBeEmpty} = require('jest-extended');
expect.extend({toBeEmpty});

const ValidationError = require("../error/validation.error");
const {OrderBy} = require("./searching/constant/orderby.constant");
const {CreatedAt} = require("./searching/constant/createtAt.constant");


describe('splitSearchQuery', () => {
  it('should split search query into terms and tags', () => {
    const query = 'term1 [tag1] term2 [tag2]';
    const expectedResult = {
      terms: ['term1', 'term2'],
      tags: ['tag1', 'tag2']
    };
    expect(searchUtils.splitSearchQuery(query)).toEqual(expectedResult);
  });
});

describe('extractFulltextAndSpecialSearchTerms', () => {
  it('should extract special search terms and filters from searched terms', () => {
    const searchedTerms = ['lang:en', 'site:github.com', 'private:only', 'term1', 'user:12345678-abcd-1234-abcd-123456789abc'];
    const expectedResult = {
      "fulltextSearchTerms": [
        "term1"
      ],
      "specialSearchTerms": {
        "lang": "en",
        "privateOnly": true,
        "site": "github.com",
        "userId": "12345678-abcd-1234-abcd-123456789abc"
      }
    }
    expect(searchUtils.extractFulltextAndSpecialSearchTerms(searchedTerms)).toEqual(expectedResult);
  });
});

describe('setFulltextSearchTermsFilter', () => {
  test('returns filter with $text when fulltextSearchTerms is not empty', () => {
    const fulltextSearchTerms = ['test'];
    const filter = {};
    const searchInclude = 'any';
    const expected = {
      ...filter,
      $text: {$search: fulltextSearchTerms.join(' ')}
    };
    expect(searchUtils.setFulltextSearchTermsFilter(fulltextSearchTerms, filter, searchInclude)).toEqual(expected);
  });

  test('returns filter without $text when fulltextSearchTerms is empty', () => {
    const fulltextSearchTerms = [];
    const filter = {};
    const searchInclude = 'any';
    expect(searchUtils.setFulltextSearchTermsFilter(fulltextSearchTerms, filter, searchInclude)).toBeEmpty();
  });
});

describe('generateFullSearchText', () => {
  it('should generate the correct full search text for given fulltext search terms', () => {
    const fulltextSearchTerms = ['apple', '-banana', 'cherry'];
    const expectedResult = '"apple" -banana "cherry"';

    expect(searchUtils.generateFullSearchText(fulltextSearchTerms)).toBe(expectedResult);
  });
});

describe('setSpecialSearchTermsFilter', () => {
  it('should set the userId filter when specialSearchTerms.userId is present and isPublic is true', () => {
    const filter = {};
    const specialSearchTerms = {userId: '123'};
    const result = searchUtils.setSpecialSearchTermsFilter(true, '123', specialSearchTerms, filter);
    expect(result).toEqual({userId: '123'});
  });

  it('should set the userId filter when specialSearchTerms.userId is present and matches the userId', () => {
    const filter = {};
    const specialSearchTerms = {userId: '123'};
    const result = searchUtils.setSpecialSearchTermsFilter(false, '123', specialSearchTerms, filter);
    expect(result).toEqual({userId: '123'});
  });

  it('should not set the userId filter when specialSearchTerms.userId is present and does not match the userId', () => {
    const filter = {};
    const specialSearchTerms = {userId: '456'};
    const result = searchUtils.setSpecialSearchTermsFilter(false, '123', specialSearchTerms, filter);
    expect(result).toEqual({});
  });

  it('should set the public filter to false when specialSearchTerms.privateOnly is present', () => {
    const filter = {};
    const specialSearchTerms = {privateOnly: true};
    const result = searchUtils.setSpecialSearchTermsFilter(false, '123', specialSearchTerms, filter);
    expect(result).toEqual({public: false});
  });

  it('should set the sourceUrl filter when specialSearchTerms.site is present', () => {
    const filter = {};
    const specialSearchTerms = {site: 'example.com'};
    const result = searchUtils.setSpecialSearchTermsFilter(false, '123', specialSearchTerms, filter);
    expect(result).toEqual({sourceUrl: /example.com/i});
  });
});


describe('setPublicOrPersonalFilter', () => {
  it('should set public to true if isPublic is true', () => {
    const filter = {};
    const result = searchUtils.setPublicOrPersonalFilter(true, filter);
    expect(result).toEqual({public: true});
  });

  it('should set userId if userId is provided', () => {
    const filter = {};
    const result = searchUtils.setPublicOrPersonalFilter(false, filter, '123');
    expect(result).toEqual({userId: '123'});
  });

  it('should throw a ValidationError if neither isPublic nor userId is provided', () => {
    const filter = {};
    expect(() => searchUtils.setPublicOrPersonalFilter(false, filter)).toThrow(ValidationError);
  });
});

describe('setTagsToFilter', () => {
  it('should set tags to $all: searchTags if searchTags is not empty', () => {
    const filter = {};
    const searchTags = ['javascript', 'react'];
    const result = searchUtils.setTagsToFilter(searchTags, filter);
    expect(result).toEqual({tags: {$all: searchTags}});
  });

  it('should return the original filter if searchTags is empty', () => {
    const filter = {userId: '123'};
    const searchTags = [];
    const result = searchUtils.setTagsToFilter(searchTags, filter);
    expect(result).toEqual(filter);
  });
});

describe('getSortByObject', () => {
  test('returns a frozen object with createdAt property set to { createdAt: -1 } when sort is "newest" or fulltextSearchTerms is empty', () => {
    const sortBy = searchUtils.getSortByObject('newest', []);
    expect(Object.isFrozen(sortBy)).toBe(true);
    expect(sortBy).toEqual({createdAt: CreatedAt.DESCENDING});
  });

  test('returns a frozen object with score property set to {$meta: "textScore"} when sort is not "newest" and fulltextSearchTerms is not empty', () => {
    const sortBy = searchUtils.getSortByObject('oldest', ['some', 'search', 'terms']);
    expect(Object.isFrozen(sortBy)).toBe(true);
    expect(sortBy).toEqual({score: {$meta: OrderBy.TEXT_SCORE}});
  });

  test('returns a frozen object with score property set to { createdAt: -1 } when sort is not "newest" but fulltextSearchTerms is empty', () => {
    const sortBy = searchUtils.getSortByObject('oldest', []);
    expect(Object.isFrozen(sortBy)).toBe(true);
    expect(sortBy).toEqual({createdAt: CreatedAt.DESCENDING});
  });
});



